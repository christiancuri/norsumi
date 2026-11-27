package com.norsumi.app.ui.navigation

import kotlinx.serialization.Serializable

@Serializable data object WelcomeRoute
@Serializable data class AuthRoute(val register: Boolean)
@Serializable data object PermissionsRoute
@Serializable data object HomeRoute
@Serializable data class ItemRoute(val id: String)
@Serializable data class CategoryRoute(val id: String)
