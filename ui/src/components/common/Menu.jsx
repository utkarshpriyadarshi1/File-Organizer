import React from "react";
import { Menu as AntdMenu } from "antd";

export const Menu = React.forwardRef((props, ref) => {
    return <AntdMenu ref={ref} {...props} />;
});

export default Menu;
