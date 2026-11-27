# norsumi R8 rules.

# kotlinx.serialization: keep generated serializers and the companion accessors used to find them.
-keepattributes *Annotation*, InnerClasses, Signature
-dontnote kotlinx.serialization.**
-keepclassmembers @kotlinx.serialization.Serializable class com.norsumi.app.** {
    *** Companion;
    *** INSTANCE;
    kotlinx.serialization.KSerializer serializer(...);
}
-keepclasseswithmembers class com.norsumi.app.** {
    kotlinx.serialization.KSerializer serializer(...);
}
-keep,includedescriptorclasses class com.norsumi.app.**$$serializer { *; }
# Type-safe navigation routes are looked up by their serializer.
-keep @kotlinx.serialization.Serializable class com.norsumi.app.ui.navigation.** { *; }

# OkHttp optional platform integrations.
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**

# Keep line numbers so crash reports from release builds stay readable.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
