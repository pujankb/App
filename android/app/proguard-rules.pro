-keepattributes *Annotation*, Signature, InnerClasses, EnclosingMethod, RuntimeVisibleAnnotations

# Keep kotlinx.serialization models & companion serializers
-keep class com.aspd.education.data.** { *; }
-keepclassmembers class com.aspd.education.data.** {
    *** Companion;
    kotlinx.serialization.KSerializer serializer(...);
}
-keep,includedescriptorclasses class com.aspd.education.data.**$$serializer { *; }

-dontwarn kotlinx.serialization.**
-dontwarn okhttp3.**
-dontwarn okio.**
