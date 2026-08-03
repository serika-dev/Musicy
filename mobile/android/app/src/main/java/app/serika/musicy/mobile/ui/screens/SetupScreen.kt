package app.serika.musicy.mobile.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.MusicNote
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import app.serika.musicy.mobile.data.api.ApiClient
import app.serika.musicy.mobile.data.model.ServerConfig
import app.serika.musicy.mobile.ui.theme.Primary
import kotlinx.coroutines.launch

@Composable
fun SetupScreen(onSave: (String, String) -> Unit) {
    val context = LocalContext.current
    var baseUrl by remember { mutableStateOf("https://music.serika.dev") }
    var apiKey by remember { mutableStateOf("") }
    var isTesting by remember { mutableStateOf(false) }
    var testResult by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val focusManager = LocalFocusManager.current

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = app.serika.musicy.mobile.ui.theme.Background
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
            .padding(24.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                imageVector = Icons.Default.MusicNote,
                contentDescription = "Musicy",
                tint = Primary,
                modifier = Modifier.size(72.dp)
            )
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = "Welcome to Musicy",
                style = MaterialTheme.typography.headlineLarge
            )
            Text(
                text = "Enter your Musicy server to get started.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(32.dp))
            OutlinedTextField(
                value = baseUrl,
                onValueChange = { baseUrl = it },
                label = { Text("Server URL") },
                placeholder = { Text("https://music.serika.dev") },
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next, keyboardType = KeyboardType.Uri),
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(modifier = Modifier.height(16.dp))
            OutlinedTextField(
                value = apiKey,
                onValueChange = { apiKey = it },
                label = { Text("API Key") },
                placeholder = { Text("Optional – required for private libraries") },
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                keyboardActions = KeyboardActions(onDone = { focusManager.clearFocus() }),
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "Self-hosted? Use your own domain and create an API key in web Settings.",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(24.dp))
            testResult?.let {
                Text(
                    text = it,
                    color = if (it.startsWith("OK")) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.labelMedium
                )
                Spacer(modifier = Modifier.height(8.dp))
            }
            Button(
                onClick = {
                    scope.launch {
                        isTesting = true
                        testResult = try {
                            val api = ApiClient.create(ServerConfig(baseUrl, apiKey))
                            api.getPublicSettings()
                            "OK: connected to ${baseUrl.trim().trimEnd('/')}"
                        } catch (e: Exception) {
                            "Error: ${e.localizedMessage ?: "Could not reach server"}"
                        }
                        isTesting = false
                    }
                },
                enabled = !isTesting && baseUrl.isNotBlank(),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Test connection")
            }
            Spacer(modifier = Modifier.height(12.dp))
            Button(
                onClick = { onSave(baseUrl, apiKey) },
                enabled = baseUrl.isNotBlank(),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Continue")
            }
        }
    }
}
