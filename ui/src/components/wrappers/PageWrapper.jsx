import React from 'react';

const PageWrapper = ({ children, style = {}, ...props }) => {
    return (
        <div 
            style={{ 
                maxWidth: '72rem', 
                margin: '0 auto', 
                paddingBottom: '3rem', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '1.5rem',
                marginTop: '1rem',
                ...style 
            }}
            {...props}
        >
            {children}
        </div>
    );
};

export default PageWrapper;
