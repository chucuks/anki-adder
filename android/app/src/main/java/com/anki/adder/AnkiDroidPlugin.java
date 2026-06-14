package com.anki.adder;

import android.app.Activity;
import android.content.pm.PackageManager;
import android.os.Build;
import android.database.Cursor;
import android.net.Uri;
import android.util.Log;
import android.util.SparseArray;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.ichi2.anki.api.AddContentApi;
import com.ichi2.anki.api.NoteInfo;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

@CapacitorPlugin(name = "AnkiDroid")
public class AnkiDroidPlugin extends Plugin {
    private static final String TAG = "AnkiDroidPlugin";
    private static final String ANKIDROID_PERMISSION = "com.ichi2.anki.permission.READ_WRITE_DATABASE";
    private static final int PERMISSION_REQUEST_CODE = 1001;

    private AddContentApi api;
    private PluginCall pendingPermissionCall;

    @Override
    public void load() {
        super.load();
        initApi();
    }

    private void initApi() {
        try {
            String pkgName = AddContentApi.getAnkiDroidPackageName(getContext());
            if (pkgName != null) {
                api = new AddContentApi(getContext());
                Log.d(TAG, "AnkiDroid found: " + pkgName);
            } else {
                api = null;
                Log.w(TAG, "AnkiDroid not installed");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error initializing AnkiDroid API", e);
            api = null;
        }
    }

    @PluginMethod()
    public void isAvailable(PluginCall call) {
        try {
            String pkgName = AddContentApi.getAnkiDroidPackageName(getContext());
            JSObject result = new JSObject();
            result.put("available", pkgName != null);
            result.put("packageName", pkgName != null ? pkgName : "");
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Error checking availability", e);
            JSObject result = new JSObject();
            result.put("available", false);
            result.put("packageName", "");
            call.resolve(result);
        }
    }

    @PluginMethod()
    public void checkPermission(PluginCall call) {
        boolean granted = hasRequiredPermission();
        Log.d(TAG, "checkPermission: " + granted);
        JSObject result = new JSObject();
        result.put("granted", granted);
        call.resolve(result);
    }

    @PluginMethod()
    public void requestPermission(PluginCall call) {
        Log.d(TAG, "requestPermission called");

        if (hasRequiredPermission()) {
            Log.d(TAG, "Permission already granted");
            JSObject result = new JSObject();
            result.put("granted", true);
            call.resolve(result);
            return;
        }

        // Store the call to resolve later
        pendingPermissionCall = call;

        // Request permission using ActivityCompat
        Activity activity = getActivity();
        if (activity != null) {
            Log.d(TAG, "Requesting permission via ActivityCompat");
            ActivityCompat.requestPermissions(
                    activity,
                    new String[] { ANKIDROID_PERMISSION },
                    PERMISSION_REQUEST_CODE);
        } else {
            Log.e(TAG, "Activity is null, cannot request permission");
            JSObject result = new JSObject();
            result.put("granted", false);
            result.put("error", "Activity not available");
            call.resolve(result);
        }
    }

    @Override
    protected void handleRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.handleRequestPermissionsResult(requestCode, permissions, grantResults);

        Log.d(TAG, "handleRequestPermissionsResult: requestCode=" + requestCode);

        if (requestCode == PERMISSION_REQUEST_CODE && pendingPermissionCall != null) {
            boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            Log.d(TAG, "Permission result: " + granted);

            // Re-initialize API after permission granted
            if (granted) {
                initApi();
            }

            JSObject result = new JSObject();
            result.put("granted", granted);
            pendingPermissionCall.resolve(result);
            pendingPermissionCall = null;
        }
    }

    private boolean hasRequiredPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            int result = ContextCompat.checkSelfPermission(getContext(), ANKIDROID_PERMISSION);
            return result == PackageManager.PERMISSION_GRANTED;
        }
        return true;
    }

    @PluginMethod()
    public void getDecks(PluginCall call) {
        Log.d(TAG, "getDecks called");

        if (api == null) {
            initApi(); // Try to reinitialize
        }

        if (api == null) {
            Log.e(TAG, "getDecks: API is null");
            call.reject("AnkiDroid is not installed or permission not granted");
            return;
        }

        try {
            Map<Long, String> decks = api.getDeckList();
            Log.d(TAG, "getDecks: got " + (decks != null ? decks.size() : 0) + " decks");

            JSArray deckArray = new JSArray();
            if (decks != null) {
                for (Map.Entry<Long, String> entry : decks.entrySet()) {
                    JSObject deck = new JSObject();
                    deck.put("id", entry.getKey());
                    deck.put("name", entry.getValue());
                    deckArray.put(deck);
                }
            }

            JSObject result = new JSObject();
            result.put("decks", deckArray);
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Error getting decks", e);
            call.reject("Failed to get decks: " + e.getMessage());
        }
    }

    @PluginMethod()
    public void getModels(PluginCall call) {
        if (api == null) {
            initApi();
        }

        if (api == null) {
            call.reject("AnkiDroid is not installed or permission not granted");
            return;
        }

        try {
            Map<Long, String> models = api.getModelList();
            JSArray modelArray = new JSArray();

            if (models != null) {
                for (Map.Entry<Long, String> entry : models.entrySet()) {
                    JSObject model = new JSObject();
                    model.put("id", entry.getKey());
                    model.put("name", entry.getValue());
                    modelArray.put(model);
                }
            }

            JSObject result = new JSObject();
            result.put("models", modelArray);
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Error getting models", e);
            call.reject("Failed to get models: " + e.getMessage());
        }
    }

    @PluginMethod()
    public void addOrGetDeck(PluginCall call) {
        String deckName = call.getString("deckName");
        if (deckName == null) {
            call.reject("deckName is required");
            return;
        }

        if (api == null) initApi();
        if (api == null) {
            call.reject("AnkiDroid API is not available");
            return;
        }

        try {
            Long deckId = null;
            Map<Long, String> decks = api.getDeckList();
            if (decks != null) {
                for (Map.Entry<Long, String> entry : decks.entrySet()) {
                    if (entry.getValue().equals(deckName)) {
                        deckId = entry.getKey();
                        break;
                    }
                }
            }

            if (deckId == null) {
                deckId = api.addNewDeck(deckName);
            }

            if (deckId != null) {
                JSObject result = new JSObject();
                result.put("deckId", deckId);
                call.resolve(result);
            } else {
                call.reject("Could not create or find deck: " + deckName);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error in addOrGetDeck", e);
            call.reject("Error: " + e.getMessage());
        }
    }

    @PluginMethod()
    public void getBasicModelId(PluginCall call) {
        if (api == null) initApi();
        if (api == null) {
            call.reject("AnkiDroid API is not available");
            return;
        }

        try {
            Map<Long, String> models = api.getModelList();
            Long modelId = null;

            if (models != null) {
                for (Map.Entry<Long, String> entry : models.entrySet()) {
                    if (entry.getValue().equals("Anki Adder Basic")) {
                        modelId = entry.getKey();
                        break;
                    }
                }
                
                // Fallback approach if custom model doesn't exist
                if (modelId == null) {
                   for (Map.Entry<Long, String> entry : models.entrySet()) {
                        if (entry.getValue().equalsIgnoreCase("Basic")) {
                            modelId = entry.getKey();
                            break;
                        }
                    }
                }
            }

            if (modelId == null) {
                String[] fields = {"Front", "Back"};
                String[] cardNames = {"Card 1"};
                String[] qfmt = {"<div style='font-family: Arial; font-size: 20px; text-align: center;'>{{Front}}</div>"};
                String[] afmt = {"<div style='font-family: Arial; font-size: 20px; text-align: center;'>{{FrontSide}}\n<hr id=answer>\n{{Back}}</div>"};
                modelId = api.addNewCustomModel("Anki Adder Basic", fields, cardNames, qfmt, afmt, ".highlight { color: #ff0000 !important; font-weight: bold; }", null, null);
            }

            JSObject result = new JSObject();
            result.put("modelId", modelId);
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Error in getBasicModelId", e);
            call.reject("Error getting basic model: " + e.getMessage());
        }
    }

    @PluginMethod()
    public void addNote(PluginCall call) {
        if (api == null) {
            initApi();
        }

        if (api == null) {
            call.reject("AnkiDroid is not installed or permission not granted");
            return;
        }

        Long deckId = call.getLong("deckId");
        Long modelId = call.getLong("modelId");
        JSArray fieldsArray = call.getArray("fields");
        String tags = call.getString("tags", "");

        if (deckId == null || modelId == null || fieldsArray == null) {
            Log.e(TAG, "addNote: missing required params. deckId=" + deckId + " modelId=" + modelId + " fields=" + (fieldsArray != null ? fieldsArray.length() : "null"));
            call.reject("Missing required parameters: deckId, modelId, fields");
            return;
        }

        try {
            String[] fields = new String[fieldsArray.length()];
            for (int i = 0; i < fieldsArray.length(); i++) {
                fields[i] = fieldsArray.getString(i);
            }

            Set<String> tagSet = null;
            if (tags != null && !tags.isEmpty()) {
                tagSet = new java.util.HashSet<>();
                for (String tag : tags.split(" ")) { // Source side uses space or comma? Client uses space.
                    tagSet.add(tag.trim());
                }
            }

            Long noteId = api.addNote(modelId, deckId, fields, tagSet);

            JSObject result = new JSObject();
            if (noteId != null) {
                result.put("success", true);
                result.put("noteId", noteId);
                call.resolve(result);
            } else {
                result.put("success", false);
                result.put("error", "Failed to add note - possibly duplicate");
                call.resolve(result);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error adding note", e);
            call.reject("Failed to add note: " + e.getMessage());
        }
    }

    @PluginMethod()
    public void getAudioModelId(PluginCall call) {
        Log.d(TAG, "getAudioModelId called");

        if (api == null) {
            initApi();
        }

        if (api == null) {
            call.reject("AnkiDroid API is not available");
            return;
        }

        try {
            Map<Long, String> models = api.getModelList();
            Long modelId = null;

            if (models != null) {
                for (Map.Entry<Long, String> entry : models.entrySet()) {
                    if (entry.getValue().equals("Anki Adder Audio v3")) {
                        modelId = entry.getKey();
                        break;
                    }
                }
            }

            if (modelId == null) {
                Log.d(TAG, "Creating 'Anki Adder Audio v3' model");
                String[] fields = {"Front", "Back", "AudioTrigger", "FrontPlain", "BackPlain"};
                String[] cardNames = {"Card 1"};
                String[] qfmt = {"<div style='font-family: Arial; font-size: 20px; text-align: center;'>{{Front}}</div>\n<div style='display:none'>{{#AudioTrigger}}{{tts en_US:FrontPlain}}{{/AudioTrigger}}</div>"};
                String[] afmt = {"<div style='font-family: Arial; font-size: 20px; text-align: center;'>{{FrontSide}}\n<hr id=answer>\n{{Back}}</div>\n<div style='display:none'>{{#AudioTrigger}}{{tts en_US:BackPlain}}{{/AudioTrigger}}</div>"};
                
                modelId = api.addNewCustomModel("Anki Adder Audio v3", fields, cardNames, qfmt, afmt, ".highlight { color: #ff0000 !important; font-weight: bold; }", null, null);
            }

            JSObject result = new JSObject();
            result.put("modelId", modelId);
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Error getting audio model", e);
            call.reject("Model error: " + e.getMessage());
        }
    }

    /**
     * Find duplicate notes by checking the first field (front) of notes with the given model.
     * Uses AnkiDroid's built-in findDuplicateNotes API which matches by first field content.
     *
     * Expected params:
     *   - modelId: long (the note type / model ID)
     *   - key: string (the first field content to search for — i.e. the front of the card)
     *
     * Returns:
     *   - duplicateIds: number[] (list of note IDs that have matching first field)
     */
    @PluginMethod()
    public void findDuplicateNotes(PluginCall call) {
        Log.d(TAG, "findDuplicateNotes called");

        if (api == null) {
            initApi();
        }

        if (api == null) {
            Log.e(TAG, "findDuplicateNotes: API is null");
            // Return empty array instead of rejecting to avoid breaking the flow
            JSObject result = new JSObject();
            result.put("duplicateIds", new JSArray());
            call.resolve(result);
            return;
        }

        Long modelId = call.getLong("modelId");
        String key = call.getString("key");

        if (modelId == null || key == null) {
            Log.e(TAG, "findDuplicateNotes: missing modelId or key");
            JSObject result = new JSObject();
            result.put("duplicateIds", new JSArray());
            call.resolve(result);
            return;
        }

        try {
            Log.d(TAG, "findDuplicateNotes: searching modelId=" + modelId + " key=" + key.substring(0, Math.min(key.length(), 50)) + "...");
            List<NoteInfo> duplicates = api.findDuplicateNotes(modelId, key);

            JSArray ids = new JSArray();
            if (duplicates != null) {
                for (NoteInfo note : duplicates) {
                    if (note != null) {
                        ids.put(note.getId());
                    }
                }
            }

            Log.d(TAG, "findDuplicateNotes: found " + ids.length() + " duplicates");

            JSObject result = new JSObject();
            result.put("duplicateIds", ids);
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Error in findDuplicateNotes", e);
            // Don't reject — return empty array to avoid breaking client logic
            JSObject result = new JSObject();
            result.put("duplicateIds", new JSArray());
            call.resolve(result);
        }
    }

    /**
     * Find notes by an arbitrary Anki search query.
     * Uses AnkiDroid's ContentProvider which allows any valid Anki search string
     * in the selection parameter.
     *
     * Params:
     *   - query: string (valid Anki search string)
     *
     * Returns:
     *   - noteIds: number[] (matching note IDs)
     */
    @PluginMethod()
    public void findNotes(PluginCall call) {
        Log.d(TAG, "findNotes called");

        String query = call.getString("query");
        if (query == null) {
            Log.e(TAG, "findNotes: query is null");
            JSObject result = new JSObject();
            result.put("noteIds", new JSArray());
            call.resolve(result);
            return;
        }

        try {
            Log.d(TAG, "findNotes: query='" + query + "'");
            Uri uri = Uri.parse("content://com.ichi2.anki.flashcards/notes");
            String[] projection = new String[] { "_id" };
            
            // In AnkiDroid's Note ContentProvider, the selection is the search query
            Cursor cursor = getContext().getContentResolver().query(uri, projection, query, null, null);
            
            JSArray noteIds = new JSArray();
            if (cursor != null) {
                try {
                    int idIndex = cursor.getColumnIndex("_id");
                    while (cursor.moveToNext()) {
                        noteIds.put(cursor.getLong(idIndex));
                    }
                } finally {
                    cursor.close();
                }
            }

            Log.d(TAG, "findNotes: found " + noteIds.length() + " notes");
            JSObject result = new JSObject();
            result.put("noteIds", noteIds);
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Error in findNotes", e);
            JSObject result = new JSObject();
            result.put("noteIds", new JSArray());
            call.resolve(result);
        }
    }
    @PluginMethod()
    public void addMedia(PluginCall call) {
        String filename = call.getString("filename");
        String base64Data = call.getString("base64Data");
        String mimeType = call.getString("mimeType", "audio/mpeg");

        if (filename == null || base64Data == null) {
            call.reject("Missing filename or base64Data");
            return;
        }

        if (api == null) initApi();
        if (api == null) {
            call.reject("AnkiDroid API is not available");
            return;
        }

        try {
            // 1. Decode base64
            byte[] data = android.util.Base64.decode(base64Data, android.util.Base64.DEFAULT);

            // 2. Write to a temporary file
            java.io.File tempFile = new java.io.File(getContext().getCacheDir(), filename);
            java.io.FileOutputStream fos = new java.io.FileOutputStream(tempFile);
            fos.write(data);
            fos.close();

            // Ensure system-level readability
            tempFile.setReadable(true, false);

            // 3. Add to AnkiDroid via FileProvider
            String pkgName = getContext().getPackageName();
            Uri uri = androidx.core.content.FileProvider.getUriForFile(getContext(), pkgName + ".fileprovider", tempFile);
            
            String ankiPkg = AddContentApi.getAnkiDroidPackageName(getContext());
            if (ankiPkg == null) ankiPkg = "com.ichi2.anki"; 
            getContext().grantUriPermission(ankiPkg, uri, android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION);
            
            String actualFilename = api.addMediaFromUri(uri, filename, mimeType);

            if (actualFilename == null) {
                call.reject("AnkiDroid rejected the media file");
                return;
            }

            JSObject result = new JSObject();
            result.put("success", true);
            result.put("filename", actualFilename);
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Error in addMedia", e);
            call.reject("Failed to add media: " + e.getMessage());
        }
    }
}
