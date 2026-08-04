package app.serika.musicy.mobile.ui.components

import androidx.compose.foundation.layout.Box
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.pulltorefresh.PullToRefreshContainer
import androidx.compose.material3.pulltorefresh.rememberPullToRefreshState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.nestedscroll.nestedScroll
import app.serika.musicy.mobile.ui.theme.Primary
import app.serika.musicy.mobile.ui.theme.SurfaceVariant

/**
 * Wraps a scrollable in the standard pull-down-to-refresh gesture.
 *
 * [isRefreshing] is driven by the caller's view model, so the spinner stays up
 * until the reload actually finishes rather than for a fixed animation.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MusicyPullToRefresh(
    isRefreshing: Boolean,
    onRefresh: () -> Unit,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit
) {
    val state = rememberPullToRefreshState()

    // The gesture completing flips the state to refreshing; that is our cue to
    // kick off the actual work exactly once.
    if (state.isRefreshing) {
        LaunchedEffect(Unit) { onRefresh() }
    }

    // When the view model reports the reload is done, retract the indicator.
    LaunchedEffect(isRefreshing) {
        if (!isRefreshing) state.endRefresh()
    }

    Box(modifier.nestedScroll(state.nestedScrollConnection)) {
        content()
        PullToRefreshContainer(
            state = state,
            modifier = Modifier.align(Alignment.TopCenter),
            containerColor = SurfaceVariant,
            contentColor = Primary
        )
    }
}
