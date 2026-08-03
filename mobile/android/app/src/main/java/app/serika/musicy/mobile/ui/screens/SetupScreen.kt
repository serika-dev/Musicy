package app.serika.musicy.mobile.ui.screens

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.filled.MusicNote
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import app.serika.musicy.mobile.data.api.ApiClient
import app.serika.musicy.mobile.data.model.*
import app.serika.musicy.mobile.ui.theme.*
import kotlinx.coroutines.launch

private enum class OnboardingPage { Welcome, Server, Auth }

@Composable
fun SetupScreen(onSave: (baseUrl: String, apiKey: String, userName: String?) -> Unit) {
    var page by remember { mutableStateOf(OnboardingPage.Welcome) }
    var baseUrl by remember { mutableStateOf("https://music.serika.dev") }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Background)
    ) {
        AuroraBackground()
        AnimatedContent(
            targetState = page,
            transitionSpec = {
                (slideInHorizontally { it } + fadeIn())
                    .togetherWith(slideOutHorizontally { -it } + fadeOut())
            },
            label = "onboarding"
        ) { target ->
            when (target) {
                OnboardingPage.Welcome -> WelcomePage { page = OnboardingPage.Server }
                OnboardingPage.Server -> ServerPage(
                    initialUrl = baseUrl,
                    onUrlChange = { baseUrl = it },
                    onBack = { page = OnboardingPage.Welcome },
                    onContinue = { page = OnboardingPage.Auth }
                )
                OnboardingPage.Auth -> AuthPage(
                    baseUrl = baseUrl,
                    onBack = { page = OnboardingPage.Server },
                    onAuthenticated = { apiKey, user ->
                        onSave(baseUrl, apiKey, user.displayName ?: user.username ?: user.email)
                    }
                )
            }
        }
    }
}

@Composable
private fun AuroraBackground() {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.radialGradient(
                    listOf(Primary.copy(alpha = 0.18f), Background),
                    center = androidx.compose.ui.geometry.Offset(0.1f, 0f),
                    radius = 900f
                )
            )
    )
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.radialGradient(
                    listOf(SecondaryViolet.copy(alpha = 0.12f), Color.Transparent),
                    center = androidx.compose.ui.geometry.Offset(0.9f, 0.1f),
                    radius = 800f
                )
            )
    )
}

@Composable
private fun WelcomePage(onStart: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(28.dp)
            .systemBarsPadding(),
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        Spacer(modifier = Modifier.height(48.dp))
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Box(
                modifier = Modifier
                    .size(120.dp)
                    .clip(RoundedCornerShape(32.dp))
                    .background(Surface),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.MusicNote,
                    contentDescription = "Musicy",
                    tint = Primary,
                    modifier = Modifier.size(64.dp)
                )
            }
            Spacer(modifier = Modifier.height(32.dp))
            Text(
                text = "Musicy",
                style = MaterialTheme.typography.displayLarge,
                color = OnBackground
            )
            Text(
                text = "Your music. Everywhere.",
                style = MaterialTheme.typography.titleMedium,
                color = OnSurfaceVariant
            )
        }
        Column {
            Text(
                text = "Connect to your Musicy server, log in, and take your library on the road — with Android Auto.",
                style = MaterialTheme.typography.bodyMedium,
                color = OnSurfaceVariant,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(horizontal = 8.dp)
            )
            Spacer(modifier = Modifier.height(24.dp))
            Button(
                onClick = onStart,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Primary)
            ) {
                Text("Get started", modifier = Modifier.padding(vertical = 6.dp))
            }
        }
    }
}

@Composable
private fun ServerPage(
    initialUrl: String,
    onUrlChange: (String) -> Unit,
    onBack: () -> Unit,
    onContinue: () -> Unit
) {
    var url by remember { mutableStateOf(initialUrl) }
    var testing by remember { mutableStateOf(false) }
    var result by remember { mutableStateOf<Pair<Boolean, String>?>(null) }
    val scope = rememberCoroutineScope()
    val focusManager = LocalFocusManager.current

    LaunchedEffect(Unit) { focusManager.clearFocus() }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp)
            .systemBarsPadding(),
        verticalArrangement = Arrangement.Center
    ) {
        Text("Where's your Musicy server?", style = MaterialTheme.typography.headlineMedium, color = OnBackground)
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            "Enter the URL of the Musicy instance you want to use. Self-hosted? Use your own domain.",
            style = MaterialTheme.typography.bodyMedium,
            color = OnSurfaceVariant
        )
        Spacer(modifier = Modifier.height(32.dp))
        OutlinedTextField(
            value = url,
            onValueChange = { url = it; onUrlChange(it) },
            label = { Text("Server URL") },
            placeholder = { Text("https://music.serika.dev") },
            keyboardOptions = KeyboardOptions(
                imeAction = ImeAction.Done,
                keyboardType = KeyboardType.Uri
            ),
            keyboardActions = KeyboardActions(onDone = { focusManager.clearFocus() }),
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(14.dp)
        )
        Spacer(modifier = Modifier.height(16.dp))
        result?.let { (success, message) ->
            Surface(
                color = if (success) Success.copy(alpha = 0.12f) else Error.copy(alpha = 0.12f),
                shape = RoundedCornerShape(12.dp)
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = if (success) Icons.Default.CheckCircle else Icons.Default.Error,
                        contentDescription = null,
                        tint = if (success) Success else Error
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(message, color = if (success) Success else Error, style = MaterialTheme.typography.bodyMedium)
                }
            }
            Spacer(modifier = Modifier.height(16.dp))
        }
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            OutlinedButton(
                onClick = onBack,
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(16.dp)
            ) { Text("Back") }
            Button(
                onClick = {
                    scope.launch {
                        testing = true
                        result = null
                        result = try {
                            val api = ApiClient.create(ServerConfig(url.trim().trimEnd('/')))
                            val settings = api.getPublicSettings()
                            val siteName = settings.settings["SITE_NAME"] ?: settings.settings["site_name"] ?: url.trim().trimEnd('/')
                            true to "Connected to $siteName"
                        } catch (e: Exception) {
                            false to (e.localizedMessage ?: "Could not reach server")
                        }
                        testing = false
                    }
                },
                enabled = url.isNotBlank() && !testing,
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(16.dp)
            ) {
                if (testing) CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
                else Text("Test connection")
            }
        }
        Spacer(modifier = Modifier.height(12.dp))
        Button(
            onClick = onContinue,
            enabled = url.isNotBlank(),
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Primary)
        ) { Text("Continue") }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AuthPage(
    baseUrl: String,
    onBack: () -> Unit,
    onAuthenticated: (apiKey: String, user: User) -> Unit
) {
    var isLogin by remember { mutableStateOf(true) }
    var email by remember { mutableStateOf("") }
    var username by remember { mutableStateOf("") }
    var displayName by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val focusManager = LocalFocusManager.current

    fun submit() {
        val email = email.trim()
        val password = password.trim()
        val username = username.trim()
        val displayName = displayName.trim()

        if (email.isBlank() || password.isBlank()) {
            error = "Email and password are required"
            return
        }
        if (!isLogin && (username.isBlank() || displayName.isBlank())) {
            error = "Username and display name are required"
            return
        }
        scope.launch {
            loading = true
            error = null
            try {
                val api = ApiClient.create(ServerConfig(baseUrl.trim().trimEnd('/')))
                if (isLogin) {
                    val response = api.login(LoginRequest(email, password))
                    val key = response.apiKey
                    val user = response.user
                    if (key != null && user != null) {
                        onAuthenticated(key, user)
                    } else {
                        error = response.message ?: "Login failed"
                    }
                } else {
                    val registerResponse = api.register(
                        RegisterRequest(email, password, username, displayName)
                    )
                    if (registerResponse.isSuccessful) {
                        val loginResponse = api.login(LoginRequest(email, password))
                        val key = loginResponse.apiKey
                        val user = loginResponse.user
                        if (key != null && user != null) {
                            onAuthenticated(key, user)
                        } else {
                            error = "Account created. Please log in."
                            isLogin = true
                        }
                    } else {
                        error = registerResponse.errorBody()?.string() ?: "Registration failed"
                    }
                }
            } catch (e: Exception) {
                error = e.localizedMessage ?: "Something went wrong"
            } finally {
                loading = false
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp)
            .systemBarsPadding(),
        verticalArrangement = Arrangement.Center
    ) {
        Text(if (isLogin) "Welcome back" else "Create account", style = MaterialTheme.typography.headlineMedium, color = OnBackground)
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            if (isLogin) "Log in to ${baseUrl.trim().trimEnd('/')}"
            else "Sign up on ${baseUrl.trim().trimEnd('/')}",
            style = MaterialTheme.typography.bodyMedium,
            color = OnSurfaceVariant
        )
        Spacer(modifier = Modifier.height(24.dp))

        SingleChoiceSegmentedButtonRow(
            modifier = Modifier.fillMaxWidth()
        ) {
            SegmentedButton(
                selected = isLogin,
                onClick = { isLogin = true },
                shape = RoundedCornerShape(topStart = 14.dp, bottomStart = 14.dp)
            ) { Text("Log in") }
            SegmentedButton(
                selected = !isLogin,
                onClick = { isLogin = false },
                shape = RoundedCornerShape(topEnd = 14.dp, bottomEnd = 14.dp)
            ) { Text("Register") }
        }

        Spacer(modifier = Modifier.height(24.dp))
        OutlinedTextField(
            value = email,
            onValueChange = { email = it },
            label = { Text("Email") },
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next, keyboardType = KeyboardType.Email),
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(14.dp)
        )
        Spacer(modifier = Modifier.height(12.dp))
        if (!isLogin) {
            OutlinedTextField(
                value = username,
                onValueChange = { username = it },
                label = { Text("Username") },
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp)
            )
            Spacer(modifier = Modifier.height(12.dp))
            OutlinedTextField(
                value = displayName,
                onValueChange = { displayName = it },
                label = { Text("Display name") },
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp)
            )
            Spacer(modifier = Modifier.height(12.dp))
        }
        OutlinedTextField(
            value = password,
            onValueChange = { password = it },
            label = { Text("Password") },
            visualTransformation = PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
            keyboardActions = KeyboardActions(onDone = { focusManager.clearFocus(); submit() }),
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(14.dp)
        )

        error?.let {
            Spacer(modifier = Modifier.height(12.dp))
            Text(it, color = Error, style = MaterialTheme.typography.bodyMedium)
        }

        Spacer(modifier = Modifier.height(24.dp))
        Button(
            onClick = { submit() },
            enabled = !loading,
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Primary)
        ) {
            if (loading) CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
            else Text(if (isLogin) "Log in" else "Create account")
        }
        Spacer(modifier = Modifier.height(12.dp))
        OutlinedButton(
            onClick = onBack,
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp)
        ) { Text("Change server") }
    }
}
