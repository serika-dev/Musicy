package app.serika.musicy;

import android.os.Bundle;
import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(MusicyDownloadsPlugin.class);
        registerPlugin(MusicyPlaybackPlugin.class);
        super.onCreate(savedInstanceState);

        WebSettings webSettings = bridge.getWebView().getSettings();
        webSettings.setMediaPlaybackRequiresUserGesture(false);
    }
}
