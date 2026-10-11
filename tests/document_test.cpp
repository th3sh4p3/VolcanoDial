#include "../firmware/VolcanoDial/document_update.hpp"
#include <cassert>
#include <cstdlib>
#include <iostream>
#include <string>
struct LimitedText {
  std::string data;size_t maximum=4096;
  size_t length()const{return data.size();}
  bool reserve(size_t n){return n<=maximum;}
  bool concat(const char* p,size_t n){if(data.size()+n>maximum)return false;data.append(p,n);return true;}
};
struct FailingAllocator : ArduinoJson::Allocator {
  bool fail=false;
  void* allocate(size_t n) override{return fail?nullptr:std::malloc(n);}
  void deallocate(void* p) override{std::free(p);}
  void* reallocate(void* p,size_t n) override{return fail?nullptr:std::realloc(p,n);}
};
int main(){
  FailingAllocator alloc;ArduinoJson::JsonDocument current(&alloc),incoming;
  current["name"]="original";incoming["name"]="replacement";
  alloc.fail=true;bool called=false;
  assert(!vd::updateDocument(current,incoming.as<ArduinoJson::JsonVariantConst>(),[&](){called=true;return true;}));
  assert(!called);assert(current["name"]=="original");
  alloc.fail=false;
  assert(!vd::updateDocument(current,incoming.as<ArduinoJson::JsonVariantConst>(),[](){return false;}));
  assert(current["name"]=="original");
  assert(vd::updateDocument(current,incoming.as<ArduinoJson::JsonVariantConst>(),[](){return true;}));
  assert(current["name"]=="replacement");
  LimitedText full;assert(vd::serializeComplete(current,full));assert(full.data=="{\"name\":\"replacement\"}");
  LimitedText shortText;shortText.maximum=4;assert(!vd::serializeComplete(current,shortText));
  LimitedText prefilled;prefilled.data="x";assert(!vd::serializeComplete(current,prefilled));
  std::cout<<"Document update tests passed\n";
}
