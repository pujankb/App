package com.aspd.education.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val AspdNavy = Color(0xFF0F172A)
val AspdBlue = Color(0xFF1D4ED8)
val AspdBlueDark = Color(0xFF1E40AF)
val AspdCanvas = Color(0xFFF8FAFC)
val AspdSurface = Color(0xFFFFFFFF)
val AspdBorder = Color(0xFFE2E8F0)
val AspdSlate = Color(0xFF475569)
val AspdSuccess = Color(0xFF059669)
val AspdDanger = Color(0xFFDC2626)

private val AspdLightColorScheme = lightColorScheme(
    primary = AspdBlue,
    onPrimary = Color.White,
    secondary = AspdNavy,
    onSecondary = Color.White,
    background = AspdCanvas,
    onBackground = AspdNavy,
    surface = AspdSurface,
    onSurface = AspdNavy,
    surfaceVariant = Color(0xFFF1F5F9),
    onSurfaceVariant = AspdSlate,
    outline = AspdBorder,
    error = AspdDanger,
    onError = Color.White,
)

@Composable
fun AspdTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = AspdLightColorScheme,
        content = content,
    )
}
