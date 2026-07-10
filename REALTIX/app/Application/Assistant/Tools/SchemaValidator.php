<?php

declare(strict_types=1);

namespace App\Application\Assistant\Tools;

/**
 * Minimal, strict JSON-Schema validator for tool inputs — exactly the subset
 * the ToolRegistry schemas use: object with typed properties (string/integer/
 * number/boolean), enum, minimum, required, additionalProperties=false.
 * Returns human-readable error messages (ro) instead of throwing.
 */
final class SchemaValidator
{
    /**
     * @param array<string,mixed> $schema an input_schema from ToolRegistry
     * @param array<string,mixed> $input
     * @return list<string> error messages; empty = valid
     */
    public static function validate(array $schema, array $input): array
    {
        $errors = [];
        $props = $schema['properties'] ?? [];

        foreach ($input as $key => $value) {
            if (! is_string($key) || ! array_key_exists($key, $props)) {
                $errors[] = "Parametru necunoscut: '{$key}'.";
                continue;
            }
            array_push($errors, ...self::checkValue($key, $value, $props[$key]));
        }

        foreach (($schema['required'] ?? []) as $required) {
            if (! array_key_exists($required, $input)) {
                $errors[] = "Parametru obligatoriu lipsă: '{$required}'.";
            }
        }

        return $errors;
    }

    /**
     * @param array<string,mixed> $spec
     * @return list<string>
     */
    private static function checkValue(string $key, mixed $value, array $spec): array
    {
        $type = $spec['type'] ?? null;
        $typeOk = match ($type) {
            'string' => is_string($value),
            'integer' => is_int($value),
            'number' => is_int($value) || is_float($value),
            'boolean' => is_bool($value),
            default => true,
        };
        if (! $typeOk) {
            return ["Parametrul '{$key}' trebuie să fie de tip {$type}."];
        }

        $errors = [];
        if (isset($spec['enum']) && ! in_array($value, $spec['enum'], true)) {
            $shown = is_scalar($value) ? (string) $value : gettype($value);
            $errors[] = "Valoare invalidă pentru '{$key}': '{$shown}'. Valori permise: "
                . implode(' | ', $spec['enum']) . '.';
        }
        if (isset($spec['minimum']) && is_numeric($value) && $value < $spec['minimum']) {
            $errors[] = "Parametrul '{$key}' trebuie să fie cel puțin {$spec['minimum']}.";
        }

        return $errors;
    }
}
