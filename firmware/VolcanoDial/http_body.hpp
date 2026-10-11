#pragma once
#include <functional>
#include <cstddef>
#include <cstdint>
namespace vd {
class HttpBody {
  std::function<int()> raw;bool chunked,ended=false;size_t limit,total=0,left=0;int64_t length;
  int bad(){failed=true;ended=true;return -1;}
  bool trailers(){
    size_t bytes=0;
    for(;;){int count=0,previous=0;bool colon=false;
      for(;;){int c=raw();if(c<0||++bytes>4096)return false;
        if(c=='\n'){if(previous!='\r')return false;break;}
        if(c==':')colon=true;if(c!='\r'&&(c<32||c>126))return false;previous=c;++count;
      }
      if(count==1)return true;if(!colon)return false;
    }
  }
 public:
  bool failed=false;
  HttpBody(std::function<int()> reader,bool chunks,size_t maximum,int64_t contentLength=-1):raw(reader),chunked(chunks),limit(maximum),length(contentLength){}
  int read(){
    if(ended)return -1;
    if(!chunked&&length>=0&&total==size_t(length)){ended=true;return -1;}
    if(chunked&&left==0){
      size_t value=0;bool digit=false,extension=false;int previous=0;
      for(int count=0;;++count){int c=raw();if(c<0||count>=128)return bad();
        if(c=='\n'){if(previous!='\r'||!digit)return bad();break;}
        if(c==';')extension=true;
        if(!extension&&c!='\r'){
          int d=c>='0'&&c<='9'?c-'0':c>='a'&&c<='f'?c-'a'+10:c>='A'&&c<='F'?c-'A'+10:-1;
          if(d<0||size_t(d)>limit||value>(limit-size_t(d))/16)return bad();value=value*16+d;digit=true;
        }previous=c;
      }
      if(value>limit-total)return bad();if(value==0){if(!trailers())return bad();ended=true;return -1;}left=value;
    }
    int c=raw();if(c<0){if(c==-2||chunked||(length>=0&&total<size_t(length)))return bad();ended=true;return -1;}
    if(total++>=limit)return bad();
    if(chunked&&--left==0){if(raw()!='\r'||raw()!='\n')return bad();}
    return c;
  }
  bool finishJson(){int c;while((c=read())>=0)if(c!=' '&&c!='\t'&&c!='\r'&&c!='\n'){bad();break;}return ended&&!failed;}
};
}
