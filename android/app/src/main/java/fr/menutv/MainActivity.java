package fr.menutv;

import android.app.Activity;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Menu TV pour Fire TV : affiche la page (copiée dans l'appli) en plein écran et fait office de proxy.
 *
 * La page est servie depuis une adresse interne http://menutv.local/ :
 *   /            → assets/www/index.html (et css/, js/, img/, musique/)
 *   /__proxy     → {"ok":true}  (la page sait alors qu'elle peut passer par le proxy)
 *   /p?u=<url>   → la requête est faite par l'appli (pas de blocage CORS), playlists .m3u8 réécrites
 * C'est l'équivalent de proxy.js : plus besoin du PC.
 */
public class MainActivity extends Activity {
    static final String HOTE = "menutv.local";
    static final String ORIGINE = "http://" + HOTE;
    static final String UA = "VLC/3.0.20 LibVLC/3.0.20";

    private WebView web;

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        web = new WebView(this);
        web.setBackgroundColor(Color.BLACK);
        setContentView(web);
        cacherBarres();

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);                    // menu, favoris, réglages (localStorage)
        s.setMediaPlaybackRequiresUserGesture(false);    // lecture auto des chaînes
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        s.setUserAgentString(s.getUserAgentString() + " MenuTV-App");

        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                if (!HOTE.equals(u.getHost())) return null;   // logos, polices… : chargement normal
                return servir(u, r.getRequestHeaders());
            }
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                return !HOTE.equals(r.getUrl().getHost());     // on ne quitte jamais la page
            }
        });
        web.setFocusable(true);
        web.requestFocus();
        web.loadUrl(ORIGINE + "/");
    }

    private void cacherBarres() {
        web.setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
    }

    /* ---------- télécommande ---------- */
    // Retour, Menu ≡ et touches médias n'arrivent pas jusqu'à la page : on les lui transmet.
    @Override
    public boolean dispatchKeyEvent(KeyEvent e) {
        String nom = null;
        switch (e.getKeyCode()) {
            case KeyEvent.KEYCODE_BACK: nom = "back"; break;
            case KeyEvent.KEYCODE_MENU: nom = "menu"; break;
            case KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE:
            case KeyEvent.KEYCODE_MEDIA_PLAY:
            case KeyEvent.KEYCODE_MEDIA_PAUSE: nom = "playpause"; break;
            case KeyEvent.KEYCODE_MEDIA_FAST_FORWARD:
            case KeyEvent.KEYCODE_MEDIA_NEXT:
            case KeyEvent.KEYCODE_CHANNEL_UP: nom = "next"; break;
            case KeyEvent.KEYCODE_MEDIA_REWIND:
            case KeyEvent.KEYCODE_MEDIA_PREVIOUS:
            case KeyEvent.KEYCODE_CHANNEL_DOWN: nom = "prev"; break;
        }
        if (nom == null) return super.dispatchKeyEvent(e);
        if (e.getAction() == KeyEvent.ACTION_DOWN && e.getRepeatCount() == 0) {
            web.evaluateJavascript("window.appKey?appKey('" + nom + "'):'exit'", res -> {
                if ("\"exit\"".equals(res)) finish();
            });
        }
        return true;
    }

    @Override
    protected void onPause() {
        web.evaluateJavascript("window.appPause&&appPause()", null);   // coupe la chaîne et la musique
        web.onPause();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
        cacherBarres();
        web.evaluateJavascript("window.appResume&&appResume()", null);
    }

    @Override
    protected void onDestroy() {
        web.destroy();
        super.onDestroy();
    }

    /* ---------- serveur interne ---------- */
    private WebResourceResponse servir(Uri u, Map<String, String> entetes) {
        String chemin = u.getPath();
        if (chemin == null || chemin.equals("/") || chemin.isEmpty()) chemin = "/index.html";
        if (chemin.equals("/__proxy")) return texte("application/json", "{\"ok\":true}", 200);
        if (chemin.equals("/p")) return relayer(u.getQueryParameter("u"), entetes);
        if (chemin.contains("..")) return texte("text/plain", "Introuvable", 404);
        try {
            InputStream in = getAssets().open("www" + chemin);
            String mime = typeMime(chemin);
            boolean texte = mime.startsWith("text/") || mime.endsWith("json") || mime.endsWith("svg+xml");
            return reponse(mime, texte ? "utf-8" : null, 200, in, cors());
        } catch (IOException e) {
            return texte("text/plain", "Introuvable", 404);
        }
    }

    private WebResourceResponse relayer(String cible, Map<String, String> entetes) {
        HttpURLConnection c = null;
        try {
            if (cible == null || !cible.matches("(?i)^https?://.+")) return texte("text/plain", "URL refusée", 400);
            URL url = new URL(cible);
            String range = entete(entetes, "Range");
            for (int saut = 0; ; saut++) {
                c = (HttpURLConnection) url.openConnection();
                c.setInstanceFollowRedirects(false);
                c.setConnectTimeout(15000);
                c.setReadTimeout(30000);
                c.setRequestProperty("User-Agent", UA);
                c.setRequestProperty("Accept", "*/*");
                if (range != null) c.setRequestProperty("Range", range);
                int code = c.getResponseCode();
                String loc = c.getHeaderField("Location");
                if (code >= 300 && code < 400 && loc != null) {
                    if (saut >= 5) throw new IOException("Trop de redirections");
                    url = new URL(url, loc);
                    c.disconnect();
                    continue;
                }
                break;
            }
            int code = c.getResponseCode();
            String ct = c.getContentType();
            InputStream in = code >= 400 ? c.getErrorStream() : c.getInputStream();
            if (in == null) in = new ByteArrayInputStream(new byte[0]);

            boolean playlist = (ct != null && ct.toLowerCase(Locale.ROOT).contains("mpegurl"))
                    || url.getPath().toLowerCase(Locale.ROOT).matches(".*\\.m3u8?$");
            Map<String, String> h = cors();
            if (playlist && code < 400) {
                String corps = reecrire(lire(in), url);
                h.put("Cache-Control", "no-store");
                return reponse("application/vnd.apple.mpegurl", "utf-8", 200,
                        new ByteArrayInputStream(corps.getBytes(StandardCharsets.UTF_8)), h);
            }
            for (String k : new String[]{"Content-Range", "Accept-Ranges", "Cache-Control", "Last-Modified"}) {
                String v = c.getHeaderField(k);
                if (v != null) h.put(k, v);
            }
            if (c.getHeaderField("Content-Encoding") == null && c.getHeaderField("Content-Length") != null)
                h.put("Content-Length", c.getHeaderField("Content-Length"));
            String mime = "application/octet-stream", enc = null;
            if (ct != null) {
                String[] p = ct.split(";");
                mime = p[0].trim();
                for (String x : p) if (x.trim().toLowerCase(Locale.ROOT).startsWith("charset=")) enc = x.trim().substring(8);
            }
            return reponse(mime, enc, code, in, h);
        } catch (Exception e) {
            if (c != null) c.disconnect();
            return texte("text/plain", "Erreur proxy : " + e.getMessage(), 502);
        }
    }

    private static final Pattern URI_ATTR = Pattern.compile("URI=\"([^\"]+)\"");

    /** Chaque adresse de la playlist (segments, sous-playlists, clés) repasse par /p. */
    static String reecrire(String texte, URL base) {
        StringBuilder sb = new StringBuilder();
        for (String ligne : texte.split("\r?\n", -1)) {
            String t = ligne.trim();
            if (t.isEmpty()) sb.append(ligne);
            else if (t.startsWith("#")) {
                Matcher m = URI_ATTR.matcher(ligne);
                StringBuffer out = new StringBuffer();
                while (m.find()) m.appendReplacement(out, Matcher.quoteReplacement("URI=\"" + viaProxy(absolue(m.group(1), base)) + "\""));
                m.appendTail(out);
                sb.append(out);
            } else sb.append(viaProxy(absolue(t, base)));
            sb.append('\n');
        }
        return sb.toString();
    }

    static String absolue(String s, URL base) {
        try { return new URL(base, s).toString(); } catch (Exception e) { return s; }
    }

    static String viaProxy(String u) {
        try { return "/p?u=" + URLEncoder.encode(u, "UTF-8"); } catch (Exception e) { return u; }
    }

    /* ---------- outils ---------- */
    private static String entete(Map<String, String> h, String nom) {
        if (h == null) return null;
        for (Map.Entry<String, String> e : h.entrySet()) if (e.getKey().equalsIgnoreCase(nom)) return e.getValue();
        return null;
    }

    private static Map<String, String> cors() {
        Map<String, String> h = new HashMap<>();
        h.put("Access-Control-Allow-Origin", "*");
        return h;
    }

    private static String lire(InputStream in) throws IOException {
        ByteArrayOutputStream o = new ByteArrayOutputStream();
        byte[] buf = new byte[16384];
        int n;
        while ((n = in.read(buf)) > 0) o.write(buf, 0, n);
        in.close();
        return o.toString("UTF-8");
    }

    private static WebResourceResponse reponse(String mime, String enc, int code, InputStream in, Map<String, String> h) {
        // Android refuse les codes 3xx et les raisons vides
        if (code >= 300 && code < 400) code = 502;
        return new WebResourceResponse(mime, enc, code, raison(code), h, in);
    }

    private static WebResourceResponse texte(String mime, String corps, int code) {
        return reponse(mime, "utf-8", code, new ByteArrayInputStream(corps.getBytes(StandardCharsets.UTF_8)), cors());
    }

    private static String raison(int code) {
        switch (code) {
            case 200: return "OK";
            case 206: return "Partial Content";
            case 400: return "Bad Request";
            case 403: return "Forbidden";
            case 404: return "Not Found";
            case 502: return "Bad Gateway";
            default: return code < 400 ? "OK" : "Error";
        }
    }

    private static String typeMime(String chemin) {
        String c = chemin.toLowerCase(Locale.ROOT);
        if (c.endsWith(".html")) return "text/html";
        if (c.endsWith(".css")) return "text/css";
        if (c.endsWith(".js")) return "text/javascript";
        if (c.endsWith(".png")) return "image/png";
        if (c.endsWith(".jpg") || c.endsWith(".jpeg")) return "image/jpeg";
        if (c.endsWith(".svg")) return "image/svg+xml";
        if (c.endsWith(".ico")) return "image/x-icon";
        if (c.endsWith(".mp3")) return "audio/mpeg";
        if (c.endsWith(".ogg")) return "audio/ogg";
        if (c.endsWith(".m4a")) return "audio/mp4";
        if (c.endsWith(".json")) return "application/json";
        return "application/octet-stream";
    }
}
