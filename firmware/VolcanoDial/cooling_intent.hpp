#pragma once
#include <string>
namespace vd {
template<class Store> class CoolingIntent {
 Store& store;std::string owner;
 public:
 explicit CoolingIntent(Store& s):store(s){}
 void load(){owner=store.read();}
 bool pending()const{return !owner.empty();}
 bool matches(const std::string& id)const{return pending()&&owner==id;}
 bool begin(const std::string& id){
  if(id.empty()||(pending()&&!matches(id)))return false;
  if(matches(id))return true;
  if(!store.write(id))return false;owner=id;return true;
 }
 // Call only after the selected plug's OFF state was actually acknowledged.
 bool complete(){if(!pending())return true;if(!store.write(""))return false;owner.clear();return true;}
};
}
