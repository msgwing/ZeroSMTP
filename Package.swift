// swift-tools-version:6.2
import PackageDescription

let package = Package(
    name: "zerosmtp-swift",
    platforms: [.macOS(.v13)],
    dependencies: [
        // sersoft-gmbh/swift-smtp: actively maintained, SwiftNIO-based.
        // Replaces the previously used Kitura/Swift-SMTP, which is
        // unmaintained and fails to build against current OpenSSL.
        // Pinned to an exact version (rather than a floating `from:`
        // range) because 2.17.0+ bumps swift-tools-version to 6.3, which
        // swift-actions/setup-swift@v2 cannot install yet (max is 6.2).
        .package(url: "https://github.com/sersoft-gmbh/swift-smtp", .exact("2.18.0"))
    ],
    targets: [
        .executableTarget(
            name: "zerosmtp-swift",
            dependencies: [
                .product(name: "SwiftSMTP", package: "swift-smtp")
            ],
            path: ".",
            sources: ["swift-zerosmtp.swift"]
        )
    ]
)
