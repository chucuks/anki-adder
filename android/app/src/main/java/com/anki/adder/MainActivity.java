package com.anki.adder;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register AnkiDroid plugin before calling super
        registerPlugin(AnkiDroidPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
