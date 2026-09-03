import java.util.Properties

plugins {
    id("com.android.application")
}

val keystorePropertiesFile = rootProject.file("keystore.properties")
val keystoreProperties = Properties().apply {
    if (keystorePropertiesFile.exists()) {
        keystorePropertiesFile.inputStream().use { input -> load(input) }
    }
}

android {
    namespace = "com.dip7ridu.resenhaflix"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.dip7ridu.resenhaflix"
        minSdk = 24
        targetSdk = 36
        versionCode = 1
        versionName = "1.0.0"

        buildConfigField(
            "String",
            "START_URL",
            "\"https://dip7ridu-exe.github.io/ResenhaFlix-teste/\""
        )
        testInstrumentationRunner = "android.test.InstrumentationTestRunner"
    }

    signingConfigs {
        if (keystorePropertiesFile.exists()) {
            create("release") {
                storeFile = rootProject.file(keystoreProperties.getProperty("storeFile"))
                storePassword = keystoreProperties.getProperty("storePassword")
                keyAlias = keystoreProperties.getProperty("keyAlias")
                keyPassword = keystoreProperties.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        debug {
            versionNameSuffix = "-pessoal"
        }
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            signingConfig = signingConfigs.findByName("release")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures {
        buildConfig = true
    }

    sourceSets {
        getByName("main").res.srcDir(layout.buildDirectory.dir("generated/resenhaflix/res"))
    }

    testOptions {
        unitTests.isIncludeAndroidResources = false
    }
}

val copyBrandAssets by tasks.registering(Copy::class) {
    from(rootProject.file("../icons/icon-512.png"))
    into(layout.buildDirectory.dir("generated/resenhaflix/res/drawable-nodpi"))
    rename { "resenhaflix_app_icon.png" }
}

tasks.named("preBuild") {
    dependsOn(copyBrandAssets)
}

dependencies {
    testImplementation("junit:junit:4.13.2")
}
