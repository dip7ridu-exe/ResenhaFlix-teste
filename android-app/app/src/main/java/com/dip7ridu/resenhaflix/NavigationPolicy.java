package com.dip7ridu.resenhaflix;

import java.net.URI;
import java.util.Locale;

final class NavigationPolicy {
    private static final String APP_HOST = "dip7ridu-exe.github.io";
    private static final String APP_PATH = "/ResenhaFlix-teste";

    private NavigationPolicy() {}

    static boolean isInternal(String rawUrl) {
        if (rawUrl == null || rawUrl.trim().isEmpty()) return false;
        try {
            URI uri = URI.create(rawUrl);
            String scheme = uri.getScheme();
            String host = uri.getHost();
            String path = uri.getPath();
            if (scheme == null || host == null || path == null) return false;
            String normalizedScheme = scheme.toLowerCase(Locale.ROOT);
            if (!normalizedScheme.equals("https")) return false;
            if (!APP_HOST.equalsIgnoreCase(host)) return false;
            return path.equals(APP_PATH) || path.startsWith(APP_PATH + "/");
        } catch (IllegalArgumentException error) {
            return false;
        }
    }
}
