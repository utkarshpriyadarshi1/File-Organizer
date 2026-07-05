import React from 'react';
import { Button, Typography, Space, Card } from './common';
import { BugOutlined, CopyOutlined, GithubOutlined, ReloadOutlined } from '@ant-design/icons';
import { PageWrapper } from './wrappers';

const { Title, Text, Paragraph } = Typography;

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({
            error: error,
            errorInfo: errorInfo
        });
        console.error("Uncaught error:", error, errorInfo);
    }

    handleCopyReport = () => {
        const report = `### App Crash Report\n\n**Error:**\n\`\`\`text\n${this.state.error?.toString()}\n\`\`\`\n\n**Component Stack:**\n\`\`\`text\n${this.state.errorInfo?.componentStack}\n\`\`\`\n\n**App Version:** 1.0.0 (Local Build)`;
        navigator.clipboard.writeText(report).then(() => {
            alert("Crash report copied to clipboard!");
        });
    }

    handleOpenGitHub = () => {
        const repoUrl = "https://github.com/utkarshpriyadarshi1/File-Organizer/issues/new";
        window.open(repoUrl, "_blank");
    }

    render() {
        if (this.state.hasError) {
            return (
                <PageWrapper style={{ maxWidth: '800px', margin: '40px auto' }}>
                    <Card style={{ borderRadius: '16px', borderColor: '#fee2e2', backgroundColor: '#fef2f2' }}>
                        <div className="flex flex-col items-center justify-center p-8 text-center space-y-6">
                            <BugOutlined style={{ fontSize: '64px', color: '#ef4444' }} />
                            <div>
                                <Title level={3} style={{ color: '#b91c1c', margin: 0 }}>Oops! Something went wrong.</Title>
                                <Text style={{ color: '#991b1b' }}>The application encountered an unexpected error and crashed.</Text>
                            </div>

                            <div className="bg-white p-4 rounded-lg border border-red-200 w-full text-left overflow-auto max-h-64 shadow-inner">
                                <Text strong type="danger" style={{ fontFamily: 'monospace' }}>
                                    {this.state.error && this.state.error.toString()}
                                </Text>
                                <br /><br />
                                <Text type="secondary" style={{ fontSize: '12px', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                                    {this.state.errorInfo && this.state.errorInfo.componentStack}
                                </Text>
                            </div>

                            <Paragraph style={{ color: '#7f1d1d', margin: 0 }}>
                                You can help us improve by reporting this issue. Click below to copy the crash report, then paste it into a new GitHub Issue!
                            </Paragraph>

                            <Space size="middle" wrap justify="center">
                                <Button 
                                    type="primary" 
                                    danger 
                                    icon={<CopyOutlined />} 
                                    onClick={this.handleCopyReport}
                                    size="large"
                                >
                                    Copy Crash Report
                                </Button>
                                <Button 
                                    type="default" 
                                    icon={<GithubOutlined />} 
                                    onClick={this.handleOpenGitHub}
                                    size="large"
                                >
                                    Report on GitHub
                                </Button>
                                <Button 
                                    type="dashed" 
                                    icon={<ReloadOutlined />} 
                                    onClick={() => window.location.reload()}
                                    size="large"
                                >
                                    Reload Application
                                </Button>
                            </Space>
                        </div>
                    </Card>
                </PageWrapper>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
