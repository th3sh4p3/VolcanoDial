#pragma once
#include <Arduino.h>
#include <NimBLEDevice.h>
#include <WiFi.h>
#include <NetworkClientSecure.h>
#include <HTTPClient.h>
#include <ESPmDNS.h>
#include <atomic>
#include <memory>
#include "esp_timer.h"
#include "mbedtls/oid.h"
#include "core.hpp"
#include "interaction.hpp"
#include "hue_ca.hpp"
#include "http_body.hpp"
#include "memory_window.hpp"

inline uint64_t nowMs(){return uint64_t(esp_timer_get_time()/1000);}
extern std::atomic<bool> keyHeld;
extern std::atomic<uint64_t> keySeen;
extern std::atomic<bool> runLocksKey;
extern std::atomic<bool> stopRequested;
extern std::atomic<bool> endHoseRequested;
bool manualDemandValid();

class Volcano : public vd::DeviceIO, public NimBLEClientCallbacks {
  NimBLEClient* client=nullptr;
  NimBLERemoteCharacteristic *temp=nullptr,*targetChar=nullptr,*stat=nullptr,*stat2=nullptr,*heatOn=nullptr,*heatOff=nullptr,*fanOn=nullptr,*fanOff=nullptr;
  vd::Snapshot data;portMUX_TYPE mux=portMUX_INITIALIZER_UNLOCKED;uint64_t fanChangedAt=0;double fanTotal=0;bool status1Fault=false,status2Fault=false;
  std::atomic<bool> ownCommand{false};std::atomic<uint64_t> quietUntil{0};
  struct Transaction {std::atomic<bool> done{false};int status=-1;uint16_t value=0;bool hasValue=false;};
  static int completed(uint16_t,const ble_gatt_error* e,ble_gatt_attr* a,void* arg){
    auto holder=static_cast<std::shared_ptr<Transaction>*>(arg);auto t=*holder;delete holder;t->status=e?e->status:-1;
    if(t->status==0&&a&&a->om&&OS_MBUF_PKTLEN(a->om)>=2){uint8_t b[2];if(os_mbuf_copydata(a->om,0,2,b)==0){t->value=uint16_t(b[0])|(uint16_t(b[1])<<8);t->hasValue=true;}}
    t->done.store(true,std::memory_order_release);return 0;
  }
  bool awaitTransaction(std::shared_ptr<Transaction> t,uint32_t timeout){
    uint64_t end=nowMs()+timeout;while(!t->done.load(std::memory_order_acquire)&&nowMs()<end)delay(2);
    if(!t->done.load(std::memory_order_acquire)){
      // A late callback owns its shared state; no stack callback pointer survives.
      error="BLE-Zeitlimit: Ausgaenge unbekannt";portENTER_CRITICAL(&mux);data.connected=false;data.valid=false;portEXIT_CRITICAL(&mux);client->disconnect();return false;
    }lastGattStatus=t->status;if(t->status!=0){++gattFailures;error="BLE-GATT Status "+String(t->status);}return t->status==0;
  }
  bool readU16(NimBLERemoteCharacteristic* c,uint16_t& v){
    if(!c||!snapshot().connected)return false;auto t=std::make_shared<Transaction>();auto h=new std::shared_ptr<Transaction>(t);
    int rc=ble_gattc_read(client->getConnHandle(),c->getHandle(),completed,h);if(rc){lastGattStatus=rc;++gattFailures;error="BLE-Lesen Startstatus "+String(rc);delete h;return false;}
    uint64_t started=nowMs();bool ok=awaitTransaction(t,750);lastReadMs=nowMs()-started;maxReadMs=std::max(maxReadMs,lastReadMs);if(!t->done.load())++readTimeouts;
    if(!ok||!t->hasValue)return false;v=t->value;return true;
  }
  bool write(NimBLERemoteCharacteristic* c,const uint8_t* b,size_t n){
    if(!c||!snapshot().connected)return false;auto t=std::make_shared<Transaction>();auto h=new std::shared_ptr<Transaction>(t);
    int rc=ble_gattc_write_flat(client->getConnHandle(),c->getHandle(),b,n,completed,h);if(rc){lastGattStatus=rc;++gattFailures;error="BLE-Schreiben Startstatus "+String(rc);delete h;return false;}return awaitTransaction(t,500);
  }
  void status(uint16_t v,bool notification){
    uint64_t n=nowMs();portENTER_CRITICAL(&mux);bool previous=data.heatRequested;
    bool fanNow=v&0x2000;if(data.fan!=fanNow){if(data.fan)fanTotal+=double(n-fanChangedAt);fanChangedAt=n;}
    data.valid=true;data.statusAt=n;data.heatRequested=v&1;data.interlock=v&2;data.heat=v&0x20;data.fanRequested=v&0x1000;data.fan=fanNow;status1Fault=v&0x4018;data.fault=status1Fault||status2Fault;bool eligible=!previous&&data.heat&&data.heatRequested&&data.interlock&&!data.fault;portEXIT_CRITICAL(&mux);
    if(notification&&eligible&&!ownCommand&&n>=quietUntil)physicalHeat=true;
  }
  bool confirmed(bool heater,bool on){auto s=snapshot();if(!s.valid||s.fault)return false;return heater?(on?(s.heat&&s.heatRequested&&s.interlock):(!s.heat&&!s.heatRequested&&!s.interlock)):(on?(s.fan&&s.fanRequested):(!s.fan&&!s.fanRequested));}
  bool output(bool heater,bool on){
    error="";
    if(!snapshot().connected||(on&&stopRequested))return false;
    if(on&&!heater&&manualHold && !manualDemandValid())return false;
    auto c=heater?(on?heatOn:heatOff):(on?fanOn:fanOff);if(!c)return false;
    ownCommand=true;quietUntil=nowMs()+1500;uint8_t value=on?1:0;
    bool written=write(c,&value,1);bool ok=false;uint64_t deadline=nowMs()+(on?2500:1000);
    do{
      // A release cancels even an unconfirmed manual ON; never queue a late ON.
      if(on&&(stopRequested||(!heater&&manualHold&&!manualDemandValid()))){
        ownCommand=false;output(heater,false);return false;
      }
      uint16_t v;if(readU16(stat,v)){status(v,false);if(confirmed(heater,on)){ok=true;break;}}
      if(!snapshot().connected)break;delay(40);
    }while(nowMs()<deadline);
    if(!on&&!ok&&snapshot().connected){write(c,&value,1);uint16_t v;if(readU16(stat,v)){status(v,false);ok=confirmed(heater,false);}}
    ownCommand=false;quietUntil=nowMs()+1500;
    // A lost write response is not permission to repeat an ON.
    return ok&&(written||!on||confirmed(heater,true));
  }
 public:
  std::atomic<bool> physicalHeat{false};std::atomic<uint32_t> generation{0};bool manualHold=false;String error;
  bool manualAirCancelled()override{return manualHold&&!manualDemandValid();}
  std::string failureDetail()override{return std::string(error.c_str());}
  uint32_t lastReadMs=0,maxReadMs=0,readTimeouts=0;std::atomic<int> disconnectReason{0};
  int lastGattStatus=0;uint32_t gattFailures=0,targetFailures=0,targetWrites=0,targetRetries=0,lastTargetMs=0,maxTargetMs=0;double lastTargetRequested=NAN,lastTargetObserved=NAN;
  void begin(){NimBLEDevice::init("Volcano Dial");NimBLEDevice::setMTU(64);client=NimBLEDevice::createClient();client->setClientCallbacks(this,false);client->setConnectTimeout(10000);client->setConnectionParams(24,40,0,200);}
  void onDisconnect(NimBLEClient*,int reason) override {disconnectReason=reason;portENTER_CRITICAL(&mux);data.connected=false;data.valid=false;portEXIT_CRITICAL(&mux);++generation;physicalHeat=false;}
  vd::Snapshot snapshot() override {portENTER_CRITICAL(&mux);auto s=data;s.fanTotalMs=fanTotal+(data.fan?double(nowMs()-fanChangedAt):0);portEXIT_CRITICAL(&mux);return s;}
  uint64_t monotonic() override{return nowMs();}
  double connectionIntervalMs(){return client&&client->isConnected()?client->getConnInfo().getConnInterval()*1.25:0;}
  void scan(JsonArray found){
    auto scanner=NimBLEDevice::getScan();scanner->setActiveScan(true);scanner->setInterval(100);scanner->setWindow(40);
    auto results=scanner->getResults(5000,false);
    for(int i=0;i<results.getCount()&&found.size()<16;++i){auto d=results.getDevice(i);auto name=d->getName();
      if(name.rfind("S&B",0)!=0&&!d->isAdvertisingService(NimBLEUUID("10110000-5354-4f52-5a26-4249434b454c")))continue;
      auto j=found.add<JsonObject>();j["id"]=d->getAddress().toString();j["addressType"]=d->getAddress().getType();j["name"]=name;
    }scanner->clearResults();
  }
  bool connect(const String& address,int type){
    error="";physicalHeat=false;quietUntil=nowMs()+3000;
    if(client->isConnected())client->disconnect();
    if(!client->connect(NimBLEAddress(std::string(address.c_str()),type))){error="Volcano nicht erreichbar. PC-App und S&B-App trennen.";return false;}
    auto control=client->getService("10110000-5354-4f52-5a26-4249434b454c");auto statusService=client->getService("10100000-5354-4f52-5a26-4249434b454c");
    if(!control||!statusService){error="Kein unterstuetzter Volcano Hybrid";client->disconnect();return false;}
    temp=control->getCharacteristic("10110001-5354-4f52-5a26-4249434b454c");targetChar=control->getCharacteristic("10110003-5354-4f52-5a26-4249434b454c");
    heatOn=control->getCharacteristic("1011000f-5354-4f52-5a26-4249434b454c");heatOff=control->getCharacteristic("10110010-5354-4f52-5a26-4249434b454c");
    fanOn=control->getCharacteristic("10110013-5354-4f52-5a26-4249434b454c");fanOff=control->getCharacteristic("10110014-5354-4f52-5a26-4249434b454c");
    stat=statusService->getCharacteristic("1010000c-5354-4f52-5a26-4249434b454c");stat2=statusService->getCharacteristic("1010000d-5354-4f52-5a26-4249434b454c");
    if(!temp||!targetChar||!heatOn||!heatOff||!fanOn||!fanOff||!stat){error="Erforderliche BLE-Merkmale fehlen";client->disconnect();return false;}
    portENTER_CRITICAL(&mux);data=vd::Snapshot{};data.connected=true;status1Fault=status2Fault=false;fanTotal=0;fanChangedAt=nowMs();portEXIT_CRITICAL(&mux);++generation;
    if(stat->canNotify())stat->subscribe(true,[this](NimBLERemoteCharacteristic*,uint8_t* p,size_t n,bool){if(n>=2)status(uint16_t(p[0])|(uint16_t(p[1])<<8),true);});
    if(!poll()){error="Volcano-Status konnte nicht gelesen werden";client->disconnect();return false;}return true;
  }
  void disconnect(){
    physicalHeat=false;portENTER_CRITICAL(&mux);data.connected=false;data.valid=false;portEXIT_CRITICAL(&mux);
    if(client&&client->isConnected())client->disconnect();
  }
  bool poll(){
    if(!snapshot().connected)return false;uint16_t v;
    if(!readU16(stat,v))return false;status(v,false);
    if(!vd::optionalReadAllowed(stopRequested,endHoseRequested,manualHold,manualDemandValid()))return false;
    if(stat2){if(!readU16(stat2,v)){portENTER_CRITICAL(&mux);data.valid=false;portEXIT_CRITICAL(&mux);return false;}portENTER_CRITICAL(&mux);status2Fault=v&0x003b;data.fault=status1Fault||status2Fault;portEXIT_CRITICAL(&mux);}
    if(!vd::optionalReadAllowed(stopRequested,endHoseRequested,manualHold,manualDemandValid()))return false;
    if(!refreshTemperature())return false;
    if(!vd::optionalReadAllowed(stopRequested,endHoseRequested,manualHold,manualDemandValid()))return false;
    if(readU16(targetChar,v)&&v>=400&&v<=2300){portENTER_CRITICAL(&mux);data.target=double(v)/10;portEXIT_CRITICAL(&mux);}return snapshot().connected;
  }
  bool refreshStatus()override{return poll();}
  bool confirmTarget(double c,bool restoring){
    error="";
    lastTargetRequested=c;lastTargetObserved=NAN;
    uint64_t started=nowMs();auto finish=[&](bool ok){lastTargetMs=nowMs()-started;maxTargetMs=std::max(maxTargetMs,lastTargetMs);if(ok)error="";return ok;};
    if(!std::isfinite(c)||c<40||c>230||!snapshot().connected)return finish(false);
    auto off=[&](){auto s=snapshot();return !s.heat&&!s.fan&&!s.heatRequested&&!s.fanRequested&&!s.interlock;};
    // Cleanup may restore the old setpoint with Stop still asserted, only
    // after the engine has confirmed both outputs OFF. It never starts heat.
    if(restoring&&!off()){error="Zieltemperatur nur bei Ausgaengen AUS wiederherstellen";return finish(false);}
    // Volcano expects the desktop protocol's 32-bit LE value in tenths C.
    // A GATT ACK confirms transport, not that the device applied the setpoint.
    uint32_t v=uint32_t(std::floor(c*10+0.5));uint8_t b[4]={uint8_t(v),uint8_t(v>>8),0,0};
    for(unsigned attempt=0;attempt<3;++attempt){
      if(!restoring&&(stopRequested||endHoseRequested)){error="Solltemperatur durch Stop abgebrochen";return finish(false);}
      if(restoring&&!off())return finish(false);
      if(!snapshot().connected)return finish(false);
      quietUntil=nowMs()+3000;if(attempt)++targetRetries;++targetWrites;
      write(targetChar,b,sizeof b);uint64_t until=nowMs()+2000;
      do{
        if(!restoring&&(stopRequested||endHoseRequested)){error="Solltemperatur durch Stop abgebrochen";return finish(false);}
        if(!snapshot().connected)return finish(false);
        uint16_t read;
        if(readU16(targetChar,read)){
          lastTargetObserved=double(read)/10;
          if(!restoring&&(stopRequested||endHoseRequested)){error="Solltemperatur durch Stop abgebrochen";return finish(false);}
          if(read==v&&snapshot().connected){portENTER_CRITICAL(&mux);data.target=double(read)/10;portEXIT_CRITICAL(&mux);return finish(true);}
        }
        if(!snapshot().connected)return finish(false);
        delay(80);
      }while(nowMs()<until);
      // Only this absolute, idempotent setpoint is retried. Never HEAT/AIR ON.
    }
    ++targetFailures;error="Solltemperatur nicht bestaetigt: "+String(c,1)+" / "+String(lastTargetObserved,1)+" C";return finish(false);
  }
  bool target(double c) override{return confirmTarget(c,false);}
  bool restoreTarget(double c) override{return confirmTarget(c,true);}
  bool refreshTemperature()override{uint16_t v;if(!readU16(temp,v)||v>2500)return false;portENTER_CRITICAL(&mux);data.current=double(v)/10;data.sampleAt=nowMs();portEXIT_CRITICAL(&mux);return true;}
  bool heat(bool v) override{return output(true,v);}
  bool fan(bool v) override{return output(false,v);}
};

class BoundedStream : public Stream {
 public:
  String buffer;size_t limit;bool overflow=false;explicit BoundedStream(size_t max):limit(max){buffer.reserve(2048);}
  size_t write(uint8_t c) override {if(buffer.length()>=limit){overflow=true;return 0;}buffer+=char(c);return 1;}
  size_t write(const uint8_t* p,size_t n) override {if(buffer.length()+n>limit){overflow=true;return 0;}return buffer.concat((const char*)p,n)?n:0;}
  int available()override{return 0;}int read()override{return -1;}int peek()override{return -1;}void flush()override{}
};
class HttpJsonStream : public Stream {
  NetworkClient& client;uint64_t until;int cached=-2;
  int raw(){while(nowMs()<until){if(client.available())return client.read();if(!client.connected())return -1;delay(1);}return -2;}
 public:
  vd::HttpBody body;
  HttpJsonStream(NetworkClient& c,bool chunked,int length):client(c),until(nowMs()+15000),body([this](){return raw();},chunked,1048576,length){}
  int read()override{if(cached!=-2){int c=cached;cached=-2;return c;}return body.read();}
  int peek()override{if(cached==-2)cached=body.read();return cached;}
  int available()override{return peek()>=0?1:0;}
  size_t write(uint8_t)override{return 0;}void flush()override{}
};
class Hue {
 public:
  std::function<bool(bool)> memoryWindow;uint32_t tlsCalls=0,tlsBeforeHeap=0,tlsAfterHeap=0;
  String address,bridgeId,key,plug,error;bool enabled=false,autoOff=false;double threshold=50;
  static bool localIP(const String& v){IPAddress ip;if(!ip.fromString(v))return false;return ip[0]==10||(ip[0]==192&&ip[1]==168)||(ip[0]==172&&ip[1]>=16&&ip[1]<=31);}
  static bool idOK(const String& id){if(id.length()!=16)return false;for(char c:id)if(!isxdigit((unsigned char)c))return false;return true;}
  bool request(const String& path,const char* method,JsonDocument& result,const String& body="",bool pairing=false,std::function<bool()> allowed=[](){return true;}){
    auto operation=[&](){++tlsCalls;tlsBeforeHeap=ESP.getFreeHeap();bool ok=requestImpl(path,method,result,body,pairing,allowed);tlsAfterHeap=ESP.getFreeHeap();return ok;};
    if(!memoryWindow)return operation();
    return vd::withMemoryWindow([&](bool enter){bool ok=memoryWindow(enter);if(!ok)error="Bibliothek nach Hue-Anfrage nicht verfügbar";return ok;},operation);
  }
  bool requestImpl(const String& path,const char* method,JsonDocument& result,const String& body,bool pairing,const std::function<bool()>& allowed){
    error="";if(WiFi.status()!=WL_CONNECTED){error="WLAN nicht verbunden";return false;}
    if(!localIP(address)){error="Lokale Bridge-IP fehlt";return false;}
    if(time(nullptr)<1735689600){error="Uhrzeit fehlt: Browser-Einrichtung oeffnen";return false;}
    IPAddress ip;ip.fromString(address);NetworkClientSecure tls;tls.setTimeout(6000);tls.setHandshakeTimeout(6);
    // Validate the Hue roots, then explicitly bind CN to the selected bridge.
    if(!idOK(bridgeId)){error="Hue-Bridge zuerst koppeln";return false;}
    uint32_t beforeHeap=ESP.getFreeHeap(),beforeBlock=ESP.getMaxAllocHeap();
    if(!tls.connect(ip,443,bridgeId.c_str(),HUE_CA,nullptr,nullptr)){char detail[100];tls.lastError(detail,sizeof detail);error="Hue-TLS: "+String(detail)+" (RAM "+String(beforeHeap)+", Block "+String(beforeBlock)+")";return false;}
    String cn;auto cert=tls.getPeerCertificate();if(cert)for(auto n=&cert->subject;n;n=n->next)if(MBEDTLS_OID_CMP(MBEDTLS_OID_AT_CN,&n->oid)==0){cn=String((const char*)n->val.p,n->val.len);break;}cn.toLowerCase();
    if(!idOK(cn)||(!bridgeId.isEmpty()&&cn!=bridgeId)){error="Falsche Hue-Bridge-Identitaet";tls.stop();return false;}
    HTTPClient http;http.setTimeout(6000);http.useHTTP10(true);http.setReuse(true); // Keep the already authenticated TLS socket.
    if(!http.begin(tls,address,443,path,true)){error="Hue-HTTP konnte nicht starten";return false;}
    const char* responseHeaders[]={"Transfer-Encoding"};http.collectHeaders(responseHeaders,1);
    if(!pairing)http.addHeader("hue-application-key",key);if(body.length())http.addHeader("Content-Type","application/json");
    if(!allowed()){error="Hue-Schaltung abgebrochen";http.end();return false;}
    int code=http.sendRequest(method,body);if(code<200||code>=300){error=(code==401||code==403)?"Hue erneut koppeln":"Hue nicht erreichbar/HTTP "+String(code);http.end();return false;}
    if(http.getSize()>1048576){error="Hue-Antwort ueber 1 MiB";http.end();return false;}
    JsonDocument filter;
    if(path=="/api"){filter[0]["success"]["username"]=true;filter[0]["error"]=true;}
    else{filter["errors"]=true;filter["bridgeid"]=true;for(auto k:{"id","owner","on","dimming","status"})filter["data"][0][k]=true;filter["data"][0]["metadata"]["name"]=true;}
    HttpJsonStream input(http.getStream(),http.header("Transfer-Encoding").indexOf("chunked")>=0,http.getSize());
    auto parseError=deserializeJson(result,input,DeserializationOption::Filter(filter));bool failed=parseError?true:!input.body.finishJson();http.end();tls.stop();
    if(parseError||failed||result.overflowed()){error="Hue-Antwort ungueltig/zu gross: "+String(parseError.c_str());return false;}
    if(result["errors"].size()){error="Hue hat die Anfrage abgelehnt";return false;}if(pairing&&bridgeId.isEmpty())bridgeId=cn;return true;
  }
  bool pair(const String& ip){
    if(!localIP(ip)){error="Lokale IPv4-Adresse erforderlich";return false;}address=ip;bridgeId="";
    // Public identification bootstrap only. Credentials and control stay on verified TLS.
    WiFiClient plain;HTTPClient identify;identify.useHTTP10(true);identify.setTimeout(3000);
    if(!identify.begin(plain,"http://"+address+"/api/config")||identify.GET()!=200){error="Bridge-Identifikation nicht erreichbar";identify.end();return false;}
    BoundedStream publicConfig(8192);int bytes=identify.writeToStream(&publicConfig);identify.end();JsonDocument cfg,filter;filter["bridgeid"]=true;
    if(bytes<0||publicConfig.overflow||deserializeJson(cfg,publicConfig.buffer,DeserializationOption::Filter(filter))){error="Bridge-Identifikation ungueltig";return false;}
    String id=cfg["bridgeid"]|"";id.toLowerCase();if(!idOK(id)){error="Bridge-ID ungueltig";return false;}bridgeId=id;
    JsonDocument verified;if(!request("/api/config","GET",verified,"",true))return false;
    String verifiedId=verified["bridgeid"]|"";verifiedId.toLowerCase();if(verifiedId!=bridgeId){error="Bridge-ID stimmt nicht mit Zertifikat ueberein";return false;}
    JsonDocument reply;if(!request("/api","POST",reply,"{\"devicetype\":\"volcano#dial\"}",true))return false;
    String k=reply[0]["success"]["username"]|"";if(k.isEmpty()){error=reply[0]["error"]["type"].as<int>()==101?"Hue-Bridge-Taste druecken und erneut koppeln":"Hue-Kopplung abgelehnt";return false;}key=k;return true;
  }
  bool devices(JsonDocument& d){return request("/clip/v2/resource/light","GET",d);}
  bool read(bool& on){
    if(plug.length()!=36){error="Steckdose auswaehlen";return false;}JsonDocument d;
    if(!request("/clip/v2/resource/light/"+plug,"GET",d))return false;auto light=d["data"][0];
    if(light.isNull()||light["dimming"].is<JsonObject>()||!light["on"]["on"].is<bool>()){error="Ressource ist keine schaltbare Steckdose";return false;}
    String owner=light["owner"]["rid"]|"";on=light["on"]["on"].as<bool>();JsonDocument links;
    if(!request("/clip/v2/resource/zigbee_connectivity","GET",links))return false;
    for(auto l:links["data"].as<JsonArray>())if(String(l["owner"]["rid"]|"")==owner&&String(l["status"]|"")=="connected")return true;
    error="Hue-Steckdose nicht erreichbar";return false;
  }
  bool power(bool on,std::function<bool()> allowed=[](){return true;}){
    bool actual;if(!read(actual))return false;if(actual==on)return true;JsonDocument result;
    if(!allowed()){error="Hue-Schaltung abgebrochen";return false;}
    if(!request("/clip/v2/resource/light/"+plug,"PUT",result,on?"{\"on\":{\"on\":true}}":"{\"on\":{\"on\":false}}",false,allowed))return false;
    for(int i=0;i<5;++i){delay(300);if(read(actual)&&actual==on)return true;}
    error="Hue-Schaltzustand nicht bestaetigt";return false;
  }
  void discover(JsonArray a){int n=MDNS.queryService("hue","tcp");for(int i=0;i<n&&a.size()<8;++i){String ip=MDNS.address(i).toString();if(localIP(ip)){auto j=a.add<JsonObject>();j["address"]=ip;j["name"]=MDNS.hostname(i);}}}
};
