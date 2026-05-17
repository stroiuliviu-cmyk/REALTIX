import logoUrl from '../../images/logo.svg';

export default function ApplicationLogo({ className = '', alt = 'REALTIX', ...props }) {
    return (
        <img
            src={logoUrl}
            alt={alt}
            className={className}
            {...props}
        />
    );
}
