#include "../firmware/VolcanoDial/http_body.hpp"
#include <cassert>
#include <string>
#include <iostream>
std::string decode(std::string s,bool chunks,size_t limit=1024){size_t i=0;vd::HttpBody b([&](){return i<s.size()?(unsigned char)s[i++]:-1;},chunks,limit);std::string out;int c;while((c=b.read())>=0)out+=char(c);assert(!b.failed);return out;}
int main(){assert(decode("hello",false)=="hello");assert(decode("3\r\nabc\r\n2;ext=yes\r\nde\r\n0\r\n\r\n",true)=="abcde");assert(decode("0\r\n\r\n",true)=="");size_t i=0;std::string s="9\r\nabcdefghi\r\n0\r\n";vd::HttpBody b([&](){return i<s.size()?(unsigned char)s[i++]:-1;},true,4);while(b.read()>=0){}assert(b.failed);i=0;s="2\r\na";vd::HttpBody t([&](){return i<s.size()?(unsigned char)s[i++]:-1;},true,20);while(t.read()>=0){}assert(t.failed);
 // A JSON parser stops at its closing brace: the HTTP framing must still finish.
 for(auto input:{std::string("2\r\n{}\r\n"),std::string("2\r\n{}\r\n0\r\n")}){size_t p=0;vd::HttpBody body([&](){return p<input.size()?(unsigned char)input[p++]:-1;},true,1024);assert(body.read()=='{');assert(body.read()=='}');assert(!body.finishJson());assert(body.failed);}
 i=0;s="2\r\n{}\r\n0\r\nX-Test: yes\r\n\r\n";vd::HttpBody complete([&](){return i<s.size()?(unsigned char)s[i++]:-1;},true,1024);assert(complete.read()=='{');assert(complete.read()=='}');assert(complete.finishJson());
 i=0;s="{}";vd::HttpBody shortBody([&](){return i<s.size()?(unsigned char)s[i++]:-1;},false,1024,3);assert(shortBody.read()=='{');assert(shortBody.read()=='}');assert(!shortBody.finishJson());
 i=0;vd::HttpBody exact([&](){return i<s.size()?(unsigned char)s[i++]:-2;},false,1024,2);assert(exact.read()=='{');assert(exact.read()=='}');assert(exact.finishJson());
 i=0;s="{}x";vd::HttpBody garbage([&](){return i<s.size()?(unsigned char)s[i++]:-1;},false,1024,3);assert(garbage.read()=='{');assert(garbage.read()=='}');assert(!garbage.finishJson());
 vd::HttpBody timeout([](){return -2;},false,1024);assert(!timeout.finishJson());
 std::cout<<"HTTP body tests passed\n";}
