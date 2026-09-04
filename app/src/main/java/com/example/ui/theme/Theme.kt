package com.example.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext

private val DarkColorScheme =
    darkColorScheme(
        primary = ImmersivePrimaryDark,
        onPrimary = ImmersiveOnPrimaryDark,
        primaryContainer = ImmersivePrimaryContainerDark,
        onPrimaryContainer = ImmersiveOnPrimaryContainerDark,
        secondary = ImmersiveSecondaryDark,
        onSecondary = ImmersiveOnSecondaryDark,
        secondaryContainer = ImmersiveSecondaryContainerDark,
        onSecondaryContainer = ImmersiveOnSecondaryContainerDark,
        tertiary = ImmersiveTertiaryDark,
        onTertiary = ImmersiveOnTertiaryDark,
        tertiaryContainer = ImmersiveTertiaryContainerDark,
        onTertiaryContainer = ImmersiveOnTertiaryContainerDark,
        background = ImmersiveBackgroundDark,
        surface = ImmersiveSurfaceDark,
        surfaceVariant = ImmersiveSurfaceVariantDark,
        outline = ImmersiveOutlineDark,
        onSurface = ImmersiveOnSurfaceDark,
        onSurfaceVariant = ImmersiveOnSurfaceVariantDark,
    )

private val LightColorScheme =
    lightColorScheme(
        primary = ImmersivePrimary,
        onPrimary = ImmersiveOnPrimary,
        primaryContainer = ImmersivePrimaryContainer,
        onPrimaryContainer = ImmersiveOnPrimaryContainer,
        secondary = ImmersiveSecondary,
        onSecondary = ImmersiveOnSecondary,
        secondaryContainer = ImmersiveSecondaryContainer,
        onSecondaryContainer = ImmersiveOnSecondaryContainer,
        tertiary = ImmersiveTertiary,
        onTertiary = ImmersiveOnTertiary,
        tertiaryContainer = ImmersiveTertiaryContainer,
        onTertiaryContainer = ImmersiveOnTertiaryContainer,
        background = ImmersiveBackgroundLight,
        surface = ImmersiveSurfaceLight,
        surfaceVariant = ImmersiveSurfaceVariantLight,
        outline = ImmersiveOutlineLight,
        onSurface = ImmersiveOnSurfaceLight,
        onSurfaceVariant = ImmersiveOnSurfaceVariantLight,
    )

@Composable
fun MyApplicationTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = false, // Use our distinct medical theme palette
    content: @Composable () -> Unit,
) {
    val colorScheme =
        when {
            dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
                val context = LocalContext.current
                if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
            }
            darkTheme -> DarkColorScheme
            else -> LightColorScheme
        }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
