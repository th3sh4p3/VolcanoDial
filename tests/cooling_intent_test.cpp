#include "../firmware/VolcanoDial/cooling_intent.hpp"
#include <cassert>
#include <iostream>
#include <string>
struct Store {
 std::string value;bool fail=false;int writes=0;
 std::string read(){return value;}
 bool write(const std::string& v){++writes;if(fail)return false;value=v;return true;}
};
int main(){
 Store s;vd::CoolingIntent<Store> intent(s);intent.load();assert(!intent.pending());
 s.fail=true;assert(!intent.begin("volcano|bridge|plug"));assert(!intent.pending());
 s.fail=false;assert(intent.begin("volcano|bridge|plug"));assert(intent.matches("volcano|bridge|plug"));
 int writes=s.writes;assert(intent.begin("volcano|bridge|plug"));assert(s.writes==writes);
 vd::CoolingIntent<Store> reboot(s);reboot.load();assert(reboot.pending());assert(reboot.matches("volcano|bridge|plug"));
 assert(!reboot.matches("other|bridge|plug"));assert(!reboot.matches("volcano|bridge|other"));
 assert(!reboot.begin("volcano|bridge|other"));assert(s.value=="volcano|bridge|plug");
 // A failed Hue OFF never calls complete; storage failure after acknowledgement
 // must also keep the owner for harmless confirmed-OFF recovery next boot.
 s.fail=true;assert(!reboot.complete());assert(reboot.pending());assert(!s.value.empty());
 s.fail=false;assert(reboot.complete());assert(!reboot.pending());assert(s.value.empty());
 vd::CoolingIntent<Store> after(s);after.load();assert(!after.pending());
 assert(!after.begin(""));assert(!after.pending());
 std::cout<<"Persistent cooling intent tests passed\n";
}
