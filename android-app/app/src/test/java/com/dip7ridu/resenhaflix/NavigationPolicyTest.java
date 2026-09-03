package com.dip7ridu.resenhaflix;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public final class NavigationPolicyTest {
    @Test
    public void keepsResenhaFlixPagesInsideTheApp() {
        assertTrue(NavigationPolicy.isInternal("https://dip7ridu-exe.github.io/ResenhaFlix-teste/"));
        assertTrue(NavigationPolicy.isInternal("https://dip7ridu-exe.github.io/ResenhaFlix-teste/index.html"));
    }

    @Test
    public void sendsOtherHostsAndSchemesOutside() {
        assertFalse(NavigationPolicy.isInternal("https://example.com/video"));
        assertFalse(NavigationPolicy.isInternal("https://dip7ridu-exe.github.io.evil.example/ResenhaFlix-teste/"));
        assertFalse(NavigationPolicy.isInternal("http://dip7ridu-exe.github.io/ResenhaFlix-teste/"));
        assertFalse(NavigationPolicy.isInternal("magnet:?xt=urn:btih:test"));
    }

    @Test
    public void rejectsSimilarButDifferentPaths() {
        assertFalse(NavigationPolicy.isInternal("https://dip7ridu-exe.github.io/ResenhaFlix-testeevil/"));
        assertFalse(NavigationPolicy.isInternal("https://dip7ridu-exe.github.io/OutroProjeto/"));
    }
}
