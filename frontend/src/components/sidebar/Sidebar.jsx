import React from 'react'
import SearchInput from './SearchInput.jsx';
import Conversations from './Conversations.jsx';
import LogoutButton from './LogoutButton.jsx';

const Sidebar = () => {
    return (
        <div className="border-r border-slate-400 p-6 flex flex-col">

            <SearchInput />
            {/*<div className="divider px-4"></div>*/}
            <Conversations />
            <LogoutButton />
        </div>
    );
}

export default Sidebar