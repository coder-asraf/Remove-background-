# Proguard rules for Cutout Studio
-keep class com.darklord.bgrm.model.** { *; }
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}
