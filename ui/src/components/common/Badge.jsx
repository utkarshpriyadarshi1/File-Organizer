import React from "react";
import { Badge as AntdBadge } from "antd";

export const Badge = React.forwardRef((props, ref) => {
    return <AntdBadge ref={ref} {...props} />;
});

export default Badge;
