plugins {
    alias(libs.plugins.androidApplication)
    alias(libs.plugins.kotlinAndroid)
    alias(libs.plugins.kotlinSerialization)
}

android {
    namespace = "app.serika.musicy.mobile"
    compileSdk = 35

    defaultConfig {
        applicationId = "app.serika.musicy.mobile"
        minSdk = 26
        targetSdk = 35
        versionCode = System.getenv("GITHUB_RUN_NUMBER")?.toIntOrNull() ?: 4
        versionName = "1.4.0"
    }

    signingConfigs {
        // A single committed key signs every build — debug and release alike —
        // so a freshly-downloaded APK installs over the previous one instead of
        // being rejected for a signature mismatch. The default debug keystore
        // is regenerated per machine/CI runner, which is exactly what made
        // "update" fail before. Not a secret: this is a self-hosted app.
        create("stable") {
            storeFile = file("musicy.keystore")
            storePassword = "musicy123"
            keyAlias = "musicy"
            keyPassword = "musicy123"
        }
    }

    buildTypes {
        getByName("debug") {
            signingConfig = signingConfigs.getByName("stable")
        }
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("stable")
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            // Ship native debug symbols (Media3/ExoPlayer bundles .so files) so
            // Play can symbolicate native crashes/ANRs. Addresses the Play
            // Console "no debug symbols" warning.
            ndk {
                debugSymbolLevel = "FULL"
            }
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        compose = true
    }
    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.14"
    }
    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.ui)
    implementation(libs.androidx.ui.graphics)
    implementation(libs.androidx.ui.tooling.preview)
    implementation(libs.androidx.material3)
    implementation(libs.androidx.material.icons.extended)
    implementation(libs.androidx.navigation.compose)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.media3.exoplayer)
    implementation(libs.androidx.media3.session)
    implementation(libs.androidx.media)
    implementation(libs.retrofit)
    implementation(libs.retrofit.kotlinx.serialization)
    implementation(libs.okhttp.logging)
    implementation(libs.kotlinx.serialization.json)
    implementation(libs.androidx.datastore.preferences)
    implementation(libs.coil.compose)
    // Pulls the dominant colour out of album art for the player tint.
    implementation(libs.androidx.palette)
    implementation(libs.kotlinx.coroutines.android)
    // Bridges suspend functions to the ListenableFuture API Media3's library
    // session callbacks are built around.
    implementation(libs.kotlinx.coroutines.guava)
    testImplementation(libs.junit)
    debugImplementation("androidx.compose.ui:ui-tooling:1.6.8")
    debugImplementation("androidx.compose.ui:ui-test-manifest:1.6.8")
}
