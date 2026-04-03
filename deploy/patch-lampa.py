import json
import os

TORR_PASS = os.environ.get("TORR_PASS", "changeme")

f = open("/opt/lampa/index.html", "r")
h = f.read()
f.close()

plugins = json.dumps([
    "https://nb557.github.io/plugins/online_mod.js",
    "https://nb557.github.io/plugins/rating.js",
    "https://lampaplugins.github.io/store/p.js",
    "https://lampame.github.io/main/nc/nc.js",
    "https://bywolf88.github.io/lampa-plugins/interface_mod.js"
])

script = '''<script>
(function(){
var p=localStorage.getItem("plugins");
if(!p||p==="[]"||p==="null"){
localStorage.setItem("plugins",'__PLUGINS__');
}
if(!localStorage.getItem("torrserver_url")||localStorage.getItem("torrserver_url")==='""'){
localStorage.setItem("torrserver_url",'"https://xxitv.ru/torrserver"');
localStorage.setItem("torrserver_login",'"admin"');
localStorage.setItem("torrserver_password",'"__TORR_PASS__"');
localStorage.setItem("torrserver_auth",'"true"');
localStorage.setItem("internal_torrclient",'"true"');
localStorage.setItem("parser_torrent_type",'"torrserver"');
}
})();
</script>
'''.replace('__PLUGINS__', plugins.replace("'", "\\'")).replace('__TORR_PASS__', TORR_PASS)

h = h.replace("</head>", script + "</head>")

f = open("/opt/lampa/index.html", "w")
f.write(h)
f.close()
print("PATCHED OK")
