param([string]$Port='COM3',[string]$SSID='')
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$form=New-Object System.Windows.Forms.Form
$form.Text='Volcano Dial - WLAN per USB einrichten';$form.Size=New-Object System.Drawing.Size(510,330);$form.StartPosition='CenterScreen'
$intro=New-Object System.Windows.Forms.Label;$intro.Text='2,4-GHz-Heim-WLAN eintragen. Die Daten werden direkt per USB auf den Dial geschrieben.';$intro.SetBounds(20,15,460,40)
$label=New-Object System.Windows.Forms.Label;$label.Text='WLAN-Name (SSID)';$label.SetBounds(20,65,440,20)
$ssidBox=New-Object System.Windows.Forms.TextBox;$ssidBox.Text=$SSID;$ssidBox.MaxLength=32;$ssidBox.SetBounds(20,87,450,25)
$pwdLabel=New-Object System.Windows.Forms.Label;$pwdLabel.Text='WLAN-Passwort';$pwdLabel.SetBounds(20,122,440,20)
$pwdBox=New-Object System.Windows.Forms.TextBox;$pwdBox.UseSystemPasswordChar=$true;$pwdBox.MaxLength=63;$pwdBox.SetBounds(20,144,450,25)
$button=New-Object System.Windows.Forms.Button;$button.Text='Auf Dial speichern';$button.SetBounds(20,185,220,32)
$status=New-Object System.Windows.Forms.Label;$status.SetBounds(20,230,450,45);$status.Text='Der Dial muss per USB angeschlossen sein. COM-Port: '+$Port
$form.Controls.AddRange(@($intro,$label,$ssidBox,$pwdLabel,$pwdBox,$button,$status))
$button.Add_Click({
 $portObject=$null
 try{
  if($ssidBox.Text.Length -eq 0){throw 'Bitte WLAN-Namen eintragen.'}
  if($pwdBox.Text.Length -gt 0 -and $pwdBox.Text.Length -lt 8){throw 'WLAN-Passwort muss mindestens 8 Zeichen haben.'}
  $json=@{command='configure';settings=@{ssid=$ssidBox.Text;password=$pwdBox.Text}}|ConvertTo-Json -Compress
  if([Text.Encoding]::UTF8.GetByteCount($json) -gt 512){throw 'WLAN-Daten fuer USB-Konsole zu lang.'}
  $portObject=[IO.Ports.SerialPort]::new($Port,115200);$portObject.Encoding=[Text.Encoding]::UTF8;$portObject.DtrEnable=$true;$portObject.ReadTimeout=8000;$portObject.WriteTimeout=2000;$portObject.NewLine="`n"
  $portObject.Open();Start-Sleep -Milliseconds 300;$portObject.DiscardInBuffer();$portObject.WriteLine($json)
  do{$line=$portObject.ReadLine().Trim()}while(-not $line.StartsWith('{'))
  $reply=$line|ConvertFrom-Json
  if(-not $reply.accepted){throw 'USB-Befehl wurde nicht angenommen.'}
  $status.Text='Daten an den Dial uebertragen. Neue IP-Adresse nach einigen Sekunden am Display ablesen.'
  $pwdBox.Clear();$button.Enabled=$false
 }catch{$status.Text=$_.Exception.Message}finally{if($portObject){if($portObject.IsOpen){$portObject.Close()};$portObject.Dispose()}}
})
[void]$form.ShowDialog();$form.Dispose()
