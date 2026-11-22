package com.aspd.education

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.mutableIntStateOf
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.aspd.education.data.AspdApiClient
import com.aspd.education.ui.AspdApp
import com.aspd.education.ui.AspdTheme

class MainActivity : ComponentActivity() {
    private val apiClient = AspdApiClient()
    private val resumeTick = mutableIntStateOf(0)

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)

        setContent {
            AspdTheme {
                AspdApp(
                    apiClient = apiClient,
                    resumeTick = resumeTick.intValue,
                )
            }
        }
    }

    override fun onResume() {
        super.onResume()
        // Automatically pull latest admin updates whenever the student returns to the app
        resumeTick.intValue += 1
    }
}
