package com.norsumi.app.ui

import androidx.compose.animation.ExperimentalSharedTransitionApi
import androidx.compose.animation.SharedTransitionLayout
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.toRoute
import com.norsumi.app.AppContainer
import com.norsumi.app.data.auth.AuthState
import com.norsumi.app.ui.categories.CategoryScreen
import com.norsumi.app.ui.components.LocalNavAnimatedScope
import com.norsumi.app.ui.components.LocalSharedTransitionScope
import com.norsumi.app.ui.detail.ItemDetailScreen
import com.norsumi.app.ui.home.HomeScreen
import com.norsumi.app.ui.navigation.AuthRoute
import com.norsumi.app.ui.navigation.CategoryRoute
import com.norsumi.app.ui.navigation.HomeRoute
import com.norsumi.app.ui.navigation.ItemRoute
import com.norsumi.app.ui.navigation.PermissionsRoute
import com.norsumi.app.ui.navigation.WelcomeRoute
import com.norsumi.app.ui.onboarding.AuthScreen
import com.norsumi.app.ui.onboarding.PermissionsScreen
import com.norsumi.app.ui.onboarding.WelcomeScreen
import com.norsumi.app.ui.theme.Motion

val LocalContainer = staticCompositionLocalOf<AppContainer> { error("No container") }

@OptIn(ExperimentalSharedTransitionApi::class)
@Composable
fun NorsumiRoot() {
    val container = LocalContainer.current
    val auth by container.authState.collectAsStateWithLifecycle()
    Box(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        if (auth == AuthState.Loading) return@Box
        val nav = rememberNavController()
        val start: Any = remember {
            when {
                auth is AuthState.SignedOut -> WelcomeRoute
                !container.settings.current.permissionsOnboarded -> PermissionsRoute
                else -> HomeRoute
            }
        }
        LaunchedEffect(auth) {
            if (auth is AuthState.SignedOut && nav.currentDestination?.route?.contains("WelcomeRoute") != true &&
                nav.currentDestination?.route?.contains("AuthRoute") != true
            ) {
                nav.navigate(WelcomeRoute) { popUpTo(0) { inclusive = true } }
            }
        }
        SharedTransitionLayout {
            CompositionLocalProvider(LocalSharedTransitionScope provides this) {
                NavHost(
                    navController = nav,
                    startDestination = start,
                    enterTransition = { slideInHorizontally(tween(Motion.Medium, easing = Motion.Easing)) { it / 6 } + fadeIn(tween(Motion.Medium)) },
                    exitTransition = { fadeOut(tween(Motion.Short)) },
                    popEnterTransition = { fadeIn(tween(Motion.Medium)) },
                    popExitTransition = {
                        slideOutHorizontally(tween(Motion.Medium, easing = Motion.Easing)) { it / 6 } + fadeOut(tween(Motion.Medium)) +
                            scaleOut(targetScale = 0.96f)
                    },
                ) {
                    composable<WelcomeRoute> {
                        WelcomeScreen(
                            onCreateAccount = { nav.navigate(AuthRoute(register = true)) },
                            onSignIn = { nav.navigate(AuthRoute(register = false)) },
                            onDemo = { nav.goAfterAuth(container) },
                        )
                    }
                    composable<AuthRoute> { entry ->
                        AuthScreen(
                            register = entry.toRoute<AuthRoute>().register,
                            onBack = { nav.popBackStack() },
                            onSignedIn = { nav.goAfterAuth(container) },
                        )
                    }
                    composable<PermissionsRoute> {
                        PermissionsScreen(onDone = {
                            if (!nav.popBackStack(HomeRoute, inclusive = false)) {
                                nav.navigate(HomeRoute) { popUpTo(0) { inclusive = true } }
                            }
                        })
                    }
                    composable<HomeRoute> {
                        CompositionLocalProvider(LocalNavAnimatedScope provides this) {
                            HomeScreen(
                                onOpenItem = { nav.navigate(ItemRoute(it)) },
                                onOpenCategory = { nav.navigate(CategoryRoute(it)) },
                                onOpenPermissions = { nav.navigate(PermissionsRoute) },
                            )
                        }
                    }
                    composable<ItemRoute> { entry ->
                        CompositionLocalProvider(LocalNavAnimatedScope provides this) {
                            ItemDetailScreen(
                                id = entry.toRoute<ItemRoute>().id,
                                onBack = { nav.popBackStack() },
                                onOpenCategory = { nav.navigate(CategoryRoute(it)) },
                            )
                        }
                    }
                    composable<CategoryRoute> { entry ->
                        CompositionLocalProvider(LocalNavAnimatedScope provides this) {
                            CategoryScreen(
                                id = entry.toRoute<CategoryRoute>().id,
                                onBack = { nav.popBackStack() },
                                onOpenItem = { nav.navigate(ItemRoute(it)) },
                                onOpenCategory = { nav.navigate(CategoryRoute(it)) },
                            )
                        }
                    }
                }
            }
        }
    }
}

private fun NavController.goAfterAuth(container: AppContainer) {
    val next: Any = if (container.settings.current.permissionsOnboarded) HomeRoute else PermissionsRoute
    navigate(next) { popUpTo(0) { inclusive = true } }
}
