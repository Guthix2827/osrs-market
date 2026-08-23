type DailyCacheEntry<T> = {
    expiresAt: number;
    value: T;
};

const getNextUtcMidnightMs = () => {
    const now =
        new Date();

    return Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,
    );
};

export async function fetchWithDailyCache<T>({key, url,}: { key: string; url: string;
}): Promise<T> {
    const cached =
        localStorage.getItem(key);

    if (cached) {
        try {
            const parsed = JSON.parse(cached) as DailyCacheEntry<T>;
            if (Date.now() < parsed.expiresAt) {
                return parsed.value;
            }
        } catch {
            localStorage.removeItem(key);
        }
    }

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(
            `Failed to fetch ${url}`,
        );
    }

    const value = await response.json() as T;

    localStorage.setItem(
        key,
        JSON.stringify({
            expiresAt: getNextUtcMidnightMs(),
            value,
        }),
    );

    return value;
}