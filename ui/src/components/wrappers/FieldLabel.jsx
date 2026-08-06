import React from 'react';
import { Typography } from '../common';

const { Text } = Typography;

const FieldLabel = ({ icon, children, style = {}, ...props }) => {
    return (
        <Text 
            type="secondary" 
            strong 
            style={{ 
                fontSize: '10px', 
                textTransform: 'uppercase', 
                letterSpacing: '0.05em', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px', 
                marginBottom: '4px',
                ...style 
            }}
            {...props}
        >
            {icon}
            {children}
        </Text>
    );
};

export default FieldLabel;
