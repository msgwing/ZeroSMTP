plugins {
    // 2.4.20-RC, nie 2.4.10, z powodu CVE-2026-53914 (GHSA-r937-wjx7-w2jp):
    // niebezpieczna deserializacja w metadanych build cache, naprawiona
    // od 2.4.20-Beta1. Stabilnej wersji z poprawka jeszcze nie ma -
    // najnowsza w maven-metadata.xml to wlasnie 2.4.20-RC.
    //
    // Ten build kompiluje jeden przykladowy plik w CI i nie wlacza build
    // cache, wiec realne ryzyko bylo znikome. Chodzi o to, ze Dependabot
    // probowal to naprawic codziennie i padal z
    // security_update_dependency_not_found, bo nie dopasowuje pluginu
    // deklarowanego przez kotlin("jvm") - czyli czerwony przebieg kazdego
    // ranka i alert, ktory nigdy sam nie znika.
    //
    // Wroc do stabilnej, gdy 2.4.20 wyjdzie.
    kotlin("jvm") version "2.4.20-RC2"
    application
}

repositories {
    mavenCentral()
}

dependencies {
    // Jakarta Mail API + the Eclipse Angus reference implementation
    // (successor to the old com.sun.mail:javax.mail coordinates).
    implementation("jakarta.mail:jakarta.mail-api:2.1.5")
    implementation("org.eclipse.angus:angus-mail:2.0.5")
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
