import { Slot } from '@radix-ui/react-slot';
import * as React from 'react';

import { cn } from '~/lib/utils';
import styles from './button.module.scss';

type ButtonVariant =
	| 'default'
	| 'destructive'
	| 'outline'
	| 'secondary'
	| 'ghost'
	| 'link';

type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

export interface ButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	asChild?: boolean;
	variant?: ButtonVariant;
	size?: ButtonSize;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	(
		{
			className,
			variant = 'default',
			size = 'default',
			asChild = false,
			...props
		},
		ref,
	) => {
		const Comp = asChild ? Slot : 'button';
		const variantClassMap: Record<ButtonVariant, string> = {
			default: styles.variantDefault,
			destructive: styles.variantDestructive,
			outline: styles.variantOutline,
			secondary: styles.variantSecondary,
			ghost: styles.variantGhost,
			link: styles.variantLink,
		};

		const sizeClassMap: Record<ButtonSize, string> = {
			default: styles.sizeDefault,
			sm: styles.sizeSm,
			lg: styles.sizeLg,
			icon: styles.sizeIcon,
		};

		return (
			<Comp
				className={cn(
					styles.button,
					variantClassMap[variant],
					sizeClassMap[size],
					className,
				)}
				ref={ref}
				{...props}
			/>
		);
	},
);
Button.displayName = 'Button';

export { Button };
