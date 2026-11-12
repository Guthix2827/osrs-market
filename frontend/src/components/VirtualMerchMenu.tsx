import {NavLink} from 'react-router-dom';
import {useState} from 'react';
import {BarChart3, ChevronDown, ChartNoAxesCombined, Compass} from 'lucide-react';

export default function VirtualMerchMenu() {
    const [open, setOpen] = useState(false);

    return (
        <div
            className="vm-menu"
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
        >
            <button
                type="button"
                className="vm-menu-trigger"
                aria-expanded={open}
                aria-haspopup="true"
                onClick={() => setOpen(value => !value)}
            >
                Virtual Merch
                <ChevronDown size={14}/>
            </button>

            {open && (
                <nav className="vm-menu-dropdown" aria-label="Virtual Merch">
                    <NavLink to="/merch/get-started" onClick={() => setOpen(false)}>
                        <Compass size={17}/> Get Started
                    </NavLink>
                    <NavLink to="/merch/portfolio" onClick={() => setOpen(false)}>
                        <ChartNoAxesCombined size={17}/> Portfolio
                    </NavLink>
                    <NavLink to="/merch/hiscores" onClick={() => setOpen(false)}>
                        <BarChart3 size={17}/> Hiscores
                    </NavLink>
                </nav>
            )}
        </div>
    );
}