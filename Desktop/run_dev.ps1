$env:PATH = 'C:\Users\Admin\.cargo\bin;' + $env:PATH
Set-Location 'C:\Users\Admin\Desktop\Stream-HUB\Desktop'
Write-Host "cargo: $(& 'C:\Users\Admin\.cargo\bin\cargo.exe' --version)"
& cmd /c "node_modules\.bin\tauri dev 2>&1"
