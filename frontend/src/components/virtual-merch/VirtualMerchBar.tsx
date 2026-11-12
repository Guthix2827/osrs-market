import './VirtualMerch.css';

type VirtualMerchBarProps = {
  availableGp: number;
  activeOffers: number;
  maxOffers: number;
  onNewOffer: () => void;
};

const formatGp = (value: number) =>
    `${value.toLocaleString('en-US')} gp`;

export default function VirtualMerchBar({
                                          availableGp,
                                          activeOffers,
                                          maxOffers,
                                          onNewOffer,
                                        }: VirtualMerchBarProps) {
  return (
      <div className="vm-bottom-bar">
          <div className="vm-bottom-bar__inner">
              <div className="vm-bottom-bar__identity">
                  <span className="vm-bottom-bar__accent" />

                  <div>
                      <strong>Virtual Merch</strong>
                      <span>Portfolio active</span>
                  </div>
              </div>

              <div className="vm-bottom-bar__stat">
                  <span>Available GP</span>
                  <strong className="vm-bottom-bar__balance">
                      {formatGp(availableGp)}
                  </strong>
              </div>

              <div className="vm-bottom-bar__stat">
                  <span>Active Offers</span>
                  <strong>
                      {activeOffers} / {maxOffers}
                  </strong>
              </div>

              <button
                  type="button"
                  className="vm-bottom-bar__action"
                  onClick={onNewOffer}
                  disabled={activeOffers >= maxOffers}
              >
                  New Offer
              </button>
          </div>
      </div>
  );
}
