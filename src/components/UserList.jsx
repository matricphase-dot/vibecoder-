import React from 'react';
import { Users } from 'lucide-react';

const UserList = ({ users }) => {
    return (
        <div className="p-4 border-t border-gray-700">
            <h3 className="text-sm font-semibold mb-2 flex items-center">
                <Users className="w-4 h-4 mr-2" /> Online ({users.length})
            </h3>
            <ul className="space-y-1 text-sm">
                {users.map((user, i) => (
                    <li key={i} className="flex items-center">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                        {user}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default UserList;
