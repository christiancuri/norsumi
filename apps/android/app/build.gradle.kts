import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
}

// Release signing is read from a file that lives outside the repository.
// Without it, release builds fall back to the debug key (fine for local testing only).
val keystorePropertiesFile = File(
    providers.environmentVariable("NORSUMI_KEYSTORE_PROPERTIES")
        .orElse(providers.systemProperty("user.home").map { "$it/.norsumi-android/keystore.properties" })
        .get(),
)
val keystoreProperties = Properties().apply {
    if (keystorePropertiesFile.isFile) keystorePropertiesFile.inputStream().use { load(it) }
}
val hasReleaseKeystore = keystoreProperties.getProperty("storeFile") != null

android {
    namespace = "com.norsumi.app"
    compileSdk = 37

    defaultConfig {
        applicationId = "com.norsumi.app"
        minSdk = 29
        targetSdk = 37
        versionCode = 3
        versionName = "0.1.2"
        buildConfigField("String", "DEFAULT_SERVER_URL", "\"https://norsumi.com\"")
        buildConfigField("String", "SOURCE_URL", "\"https://github.com/christiancuri/norsumi\"")
    }

    signingConfigs {
        if (hasReleaseKeystore) {
            create("release") {
                storeFile = File(keystoreProperties.getProperty("storeFile"))
                storePassword = keystoreProperties.getProperty("storePassword")
                keyAlias = keystoreProperties.getProperty("keyAlias")
                keyPassword = keystoreProperties.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        debug {
            // Installs next to the release app (separate data and session), e.g. for local testing.
            applicationIdSuffix = ".debug"
            // Reaches a local API through `adb reverse tcp:3000 tcp:3000`.
            buildConfigField("String", "DEFAULT_SERVER_URL", "\"http://localhost:3000\"")
        }
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            signingConfig = if (hasReleaseKeystore) {
                signingConfigs.getByName("release")
            } else {
                signingConfigs.getByName("debug")
            }
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    packaging {
        resources.excludes += setOf("/META-INF/{AL2.0,LGPL2.1}", "/META-INF/*.version")
    }

    dependenciesInfo {
        includeInApk = false
        includeInBundle = false
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.lifecycle.process)
    implementation(libs.androidx.datastore.preferences)
    implementation(libs.androidx.navigation.compose)
    implementation(libs.androidx.work.runtime)
    implementation(libs.kotlinx.coroutines.android)
    implementation(libs.kotlinx.serialization.json)

    implementation(platform(libs.compose.bom))
    implementation(libs.compose.ui)
    implementation(libs.compose.animation)
    implementation(libs.compose.material3)
    implementation(libs.compose.material.icons)
    implementation(libs.compose.ui.tooling.preview)
    debugImplementation(libs.compose.ui.tooling)

    implementation(libs.androidx.credentials)
    implementation(libs.androidx.credentials.play)
    implementation(libs.googleid)

    implementation(libs.okhttp)
    debugImplementation(libs.okhttp.logging)
    implementation(libs.coil.compose)
    implementation(libs.coil.network.okhttp)

    testImplementation(libs.junit)
    testImplementation(libs.kotlinx.coroutines.test)
}

// `./gradlew dist` builds the release APK and copies it to dist/norsumi-<version>.apk.
tasks.register<Copy>("dist") {
    val apkName = "norsumi-${android.defaultConfig.versionName}.apk"
    val signedWithReleaseKey = hasReleaseKeystore
    group = "distribution"
    description = "Builds the signed release APK into dist/."
    dependsOn("assembleRelease")
    from(layout.buildDirectory.dir("outputs/apk/release")) {
        include("*.apk")
        rename { apkName }
    }
    into(rootProject.layout.projectDirectory.dir("dist"))
    doFirst {
        if (!signedWithReleaseKey) {
            logger.warn("No release keystore found: the APK in dist/ is signed with the debug key.")
        }
    }
}
