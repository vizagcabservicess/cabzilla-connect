<?php
file_put_contents($_SERVER['DOCUMENT_ROOT'] . '/logs/testlog.log', "Test log at " . date('c') . "\n", FILE_APPEND);
echo "Test log written";
?> 