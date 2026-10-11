#pragma once
namespace vd {
// Restore resident data on both successful and failed network operations.
template<class Lease,class Work> bool withMemoryWindow(Lease&& lease,Work&& work){
 if(!lease(true))return false;
 bool ok=work();bool restored=lease(false);return ok&&restored;
}
}
