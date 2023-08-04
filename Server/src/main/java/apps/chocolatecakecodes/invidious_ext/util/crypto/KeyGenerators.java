/*
 * Copyright 2011-2016 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/*
MODIFIED:
    - removed methods for all KeyGenerators except SecureRandomBytesKeyGenerator
 */

package apps.chocolatecakecodes.invidious_ext.util.crypto;

import java.security.SecureRandom;

/**
 * Factory for commonly used key generators. Public API for constructing a
 * {@link BytesKeyGenerator}.
 *
 * @author Keith Donald
 */
public final class KeyGenerators {

    private KeyGenerators() {
    }

    /**
     * Create a {@link BytesKeyGenerator} that uses a {@link SecureRandom} to generate
     * keys of 8 bytes in length.
     */
    public static BytesKeyGenerator secureRandom() {
        return new SecureRandomBytesKeyGenerator();
    }

    /**
     * Create a {@link BytesKeyGenerator} that uses a {@link SecureRandom} to generate
     * keys of a custom length.
     * @param keyLength the key length in bytes, e.g. 16, for a 16 byte key.
     */
    public static BytesKeyGenerator secureRandom(int keyLength) {
        return new SecureRandomBytesKeyGenerator(keyLength);
    }

}
