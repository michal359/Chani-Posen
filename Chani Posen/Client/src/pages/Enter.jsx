import React from "react";
import { NavLink } from "react-router-dom";
import 'react-image-gallery/styles/css/image-gallery.css';
import '../css/enter.css';

export default function EnterPage() {

    return (
        <>
            <div className='enterLinks'>
                <NavLink to="/login" className="styledLink">התחברות</NavLink>
            </div>
        </>
    );
}
