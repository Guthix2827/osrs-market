export function formatLocalDateTime(utcDate: string): string {
    const date = new Date(utcDate);

    if (Number.isNaN(date.getTime())) {
        return '—';
    }

    const parts = new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    }).formatToParts(date);

    const get = (type: string) =>
        parts.find(part => part.type === type)?.value ?? '';

    return `${get('day')}-${get('month')}-${get('year')} ${get('hour')}:${get('minute')}`;
}
