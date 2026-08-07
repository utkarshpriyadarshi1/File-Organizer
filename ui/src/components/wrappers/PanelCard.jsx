import React from 'react';
import { Card, Space, Typography } from '../common';

const { Text } = Typography;

const PanelCard = ({ title, subtitle, icon, extra, children, bodyStyle = {}, ...props }) => {
    return (
        <Card
            style={{ 
                borderRadius: '1rem', 
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                display: 'flex',
                flexDirection: 'column',
                ...props.style
            }}
            bodyStyle={bodyStyle}
            title={ (title || subtitle || icon || extra) ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '4px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {icon && React.cloneElement(icon, { style: { fontSize: '18px', ...(icon.props?.style || {}) }})}
                        <div>
                            <Text strong style={{ display: 'block', lineHeight: 1.2, fontSize: '14px', color: '#1e293b' }}>{title}</Text>
                            {subtitle && <Text type="secondary" style={{ display: 'block', marginTop: '2px', fontSize: '10px', fontWeight: 600 }}>{subtitle}</Text>}
                        </div>
                    </div>
                    {extra && (
                        <Space size={8}>
                            {extra}
                        </Space>
                    )}
                </div>
            ) : null }
            {...props}
        >
            {children}
        </Card>
    );
};

export default PanelCard;
