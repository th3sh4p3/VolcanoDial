param([string]$Port="COM3",[string]$Json='{"command":"info"}')
$ErrorActionPreference='Stop'
if($Port -notmatch '^COM[0-9]+$'){throw 'Ungueltiger COM-Port'}
$p=[System.IO.Ports.SerialPort]::new($Port,115200,[System.IO.Ports.Parity]::None,8,[System.IO.Ports.StopBits]::One)
$p.Encoding=[Text.Encoding]::UTF8;$p.ReadTimeout=12000;$p.WriteTimeout=2000;$p.DtrEnable=$true;$p.NewLine="`n"
try{$p.Open();Start-Sleep -Milliseconds 300;$p.DiscardInBuffer();$p.WriteLine($Json);do{$line=$p.ReadLine().Trim()}while(-not $line.StartsWith('{'));$line}finally{if($p.IsOpen){$p.Close()};$p.Dispose()}
