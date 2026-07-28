plugins {
    kotlin("jvm") version "2.4.10"
    application
}

repositories {
    mavenCentral()
}

dependencies {
    // Jakarta Mail API + the Eclipse Angus reference implementation
    // (successor to the old com.sun.mail:javax.mail coordinates).
    implementation("jakarta.mail:jakarta.mail-api:2.1.5")
    implementation("org.eclipse.angus:angus-mail:2.0.3")
}

kotlin {
    jvmToolchain(21)
}

// This repo keeps one file per language at the project root instead of the
// standard src/main/kotlin layout, so point Gradle at it directly.
sourceSets {
    main {
        kotlin.setSrcDirs(listOf("."))
        kotlin.include("kotlin-zerosmtp.kt")
    }
}

application {
    // Matches the @file:JvmName("KotlinZerosmtp") annotation in
    // kotlin-zerosmtp.kt, since the default name derived from a hyphenated
    // filename would not be a valid JVM class name.
    mainClass.set("KotlinZerosmtp")
}
