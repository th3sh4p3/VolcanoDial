#pragma once
#include <ArduinoJson.h>
namespace vd {
template<class Text>
bool serializeComplete(ArduinoJson::JsonVariantConst document,Text& text){
  size_t expected=ArduinoJson::measureJson(document);
  if(text.length()!=0||!text.reserve(expected))return false;
  struct Writer {
    Text& output;
    size_t write(uint8_t c){return output.concat(reinterpret_cast<const char*>(&c),1)?1:0;}
    size_t write(const uint8_t* p,size_t n){return output.concat(reinterpret_cast<const char*>(p),n)?n:0;}
  } writer{text};
  ArduinoJson::serializeJson(document,writer);return text.length()==expected;
}
template<class Commit>
bool updateDocument(ArduinoJson::JsonDocument& current,ArduinoJson::JsonVariantConst incoming,Commit commit){
  ArduinoJson::JsonDocument candidate(current.allocator());
  if(!candidate.set(incoming)||candidate.overflowed())return false;
  swap(current,candidate);
  if(current.overflowed()||!commit()){swap(current,candidate);return false;}
  return true;
}
}
