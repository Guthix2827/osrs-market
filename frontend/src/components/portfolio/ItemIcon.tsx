import { API_BASE_URL } from '../../config/api.ts';

type ItemIconProps = {
    itemId: number;
    name: string;
};

export default function ItemIcon({ itemId, name }: ItemIconProps) {
    return (
        <img
            src={`${API_BASE_URL}/icons/${itemId}.png`}
            alt={name}
            loading="eager"
            decoding="async"
            onError={(e) => {
                e.currentTarget.style.display = 'none';
            }}
        />
    );
}