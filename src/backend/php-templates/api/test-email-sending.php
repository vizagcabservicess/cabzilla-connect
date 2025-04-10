
<?php
// Redirect to the simpler test-email.php endpoint that has been fixed
header('Location: test-email.php?' . $_SERVER['QUERY_STRING']);
exit;
